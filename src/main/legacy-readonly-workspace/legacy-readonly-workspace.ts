import { randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type Database from 'better-sqlite3';
import type { LegacyReadOnlyAssetProjection, LegacyReadOnlyProjection, LegacyReadOnlyReview, LegacyReadOnlyWorkspace } from '../../shared/contracts/external-connected-library.contract';
import { openReadonlyLibraryDatabase, sqliteRecoverySidecarsAbsent } from '../library-lifecycle/readonly-library-database.internal';
const ID = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u;
const MAX_PREVIEW_BYTES = 32 * 1024 * 1024;
interface LegacySelection {
    databasePath: string;
    assetRootDirectory: string;
    /** Explicit root used to resolve historical `~/...` references. */
    tildeRootDirectory?: string;
}
export interface LegacyDatabaseSelectionPort {
    selectLegacyDatabase(): Promise<{
        kind: 'cancelled';
    } | ({
        kind: 'selected';
    } & LegacySelection)>;
}
interface FileNode {
    dev: bigint;
    ino: bigint;
    mode: bigint;
    size: bigint;
    mtimeNs: bigint;
}
interface PreparedReview {
    public: LegacyReadOnlyReview;
    selection: LegacySelection;
    databaseNode: FileNode;
    assetRootNode: FileNode;
    tildeRootNode: FileNode;
}
export function createLegacyReadOnlyWorkspace(input: {
    selection: LegacyDatabaseSelectionPort;
    evidenceLevel?: 'synthetic-read-only' | 'local-read-only';
    createIdentity?(kind: string): string;
}): LegacyReadOnlyWorkspace {
    const createIdentity = input.createIdentity ?? ((kind: string) => `${kind}:${randomUUID()}`);
    let projection: LegacyReadOnlyProjection = unopenedProjection();
    let review: PreparedReview | null = null;
    let database: Database.Database | null = null;
    let active: PreparedReview | null = null;
    const inspect = () => ({
        ...projection,
        counts: { ...projection.counts },
        limitations: [...projection.limitations]
    });
    const prepare: LegacyReadOnlyWorkspace['prepare'] = async () => {
        const selected = await input.selection.selectLegacyDatabase();
        if (selected.kind === 'cancelled')
            return selected;
        const selection = normalizeSelection(selected);
        const databaseNode = await regularFileNode(selection.databasePath);
        const assetRootNode = await directoryNode(selection.assetRootDirectory);
        const tildeRootNode = await directoryNode(selection.tildeRootDirectory ?? selection.assetRootDirectory);
        assertNoRecoverySidecars(selection.databasePath);
        const candidate = openReadonlyLibraryDatabase(selection.databasePath);
        try {
            await assertSelectionUnchanged(selection, databaseNode, assetRootNode, tildeRootNode);
            assertLegacySchema(candidate);
            const counts = readCounts(candidate);
            const publicReview: LegacyReadOnlyReview = {
                receipt: createIdentity('legacy-readonly-review'),
                counts,
                databaseIntegrity: 'ok',
                access: 'read-only',
                mutationPolicy: 'no-migration-no-copy-no-write',
                confirmable: true
            };
            review = { public: publicReview, selection, databaseNode, assetRootNode, tildeRootNode };
            projection = { ...projection, state: 'review-required', counts };
            return { kind: 'planned', review: publicReview };
        }
        finally {
            candidate.close();
            await assertSelectionUnchanged(selection, databaseNode, assetRootNode, tildeRootNode);
        }
    };
    const confirm: LegacyReadOnlyWorkspace['confirm'] = async (receipt) => {
        if (!review || review.public.receipt !== receipt)
            throw new Error('LEGACY_READONLY_REVIEW_STALE');
        await assertPreparedReview(review);
        const opened = openReadonlyLibraryDatabase(review.selection.databasePath);
        try {
            await assertPreparedReview(review);
            assertLegacySchema(opened);
            const counts = readCounts(opened);
            await assertPreparedReview(review);
            database?.close();
            database = opened;
            active = review;
            review = null;
            projection = {
                state: 'ready',
                evidenceLevel: input.evidenceLevel ?? 'local-read-only',
                identity: createIdentity('legacy-readonly-library'),
                generation: createIdentity('legacy-readonly-generation'),
                counts,
                limitations: [
                    'The selected legacy database is held in a read-only transaction and is never migrated or attached to a writer.',
                    'Preview reads are limited to the separately selected asset root and supported image bytes.',
                    'Legacy content is not automatically copied or merged into Eagle.'
                ]
            };
            return inspect();
        }
        catch (error) {
            opened.close();
            throw error;
        }
    };
    const list = async (): Promise<readonly LegacyReadOnlyAssetProjection[]> => {
        const { db, selection } = await requireReady(database, active);
        const rows = db.prepare(`
      SELECT a.id, a.title, a.file_name AS fileName, a.thumbnail_path AS thumbnailPath
      FROM assets a
      ORDER BY a.created_at DESC, a.id
    `).all() as Array<{
            id: string;
            title: string;
            fileName: string;
            thumbnailPath: string;
        }>;
        const tagRows = db.prepare(`
      SELECT at.asset_id AS assetId, t.name
      FROM asset_tags at
      JOIN tags t ON t.id = at.tag_id
      WHERE at.status = 'confirmed'
      ORDER BY at.asset_id, t.name
    `).all() as Array<{
            assetId: string;
            name: string;
        }>;
        const tags = new Map<string, string[]>();
        for (const row of tagRows)
            tags.set(row.assetId, [...(tags.get(row.assetId) ?? []), row.name]);
        const projected = await Promise.all(rows.map(async (row) => ({
            id: row.id,
            title: row.title,
            fileName: row.fileName,
            tags: tags.get(row.id) ?? [],
            previewRef: row.thumbnailPath ? `legacy-preview:${row.id}` : null,
            referencedFileAvailable: await isSafePreviewCandidate(row.thumbnailPath, selection)
        })));
        await assertPreparedReview(active!);
        return projected;
    };
    const search = async (query: string) => {
        const value = query.normalize('NFKC').trim().toLocaleLowerCase();
        return (await list()).filter((item) => !value ||
            [item.title, item.fileName, ...item.tags].some((field) => field.toLocaleLowerCase().includes(value)));
    };
    const readPreview = async (assetId: string): Promise<Uint8Array> => {
        if (!ID.test(assetId))
            throw new Error('LEGACY_READONLY_REQUEST_INVALID');
        const { db, selection } = await requireReady(database, active);
        const row = db.prepare('SELECT thumbnail_path AS thumbnailPath FROM assets WHERE id = ?').get(assetId) as {
            thumbnailPath: string;
        } | undefined;
        if (!row?.thumbnailPath)
            throw new Error('LEGACY_READONLY_PREVIEW_UNAVAILABLE');
        const candidate = await resolvePreviewPath(row.thumbnailPath, selection);
        const handle = await fs.open(candidate, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
        try {
            const before = await handle.stat({ bigint: true });
            if (!before.isFile() || before.size <= 0n || before.size > BigInt(MAX_PREVIEW_BYTES)) {
                throw new Error('LEGACY_READONLY_PREVIEW_UNAVAILABLE');
            }
            const bytes = await handle.readFile();
            const after = await handle.stat({ bigint: true });
            if (!sameFileNode(toFileNode(before), toFileNode(after)) ||
                bytes.byteLength !== Number(after.size) || !isSupportedImage(bytes)) {
                throw new Error('LEGACY_READONLY_PREVIEW_UNAVAILABLE');
            }
            await assertPreparedReview(active!);
            return new Uint8Array(bytes);
        }
        finally {
            await handle.close();
        }
    };
    const close = async () => {
        if (database?.open)
            database.close();
        let invariantError: unknown = null;
        if (active) {
            try {
                await assertPreparedReview(active);
            }
            catch (error) {
                invariantError = error;
            }
        }
        database = null;
        active = null;
        review = null;
        projection = { ...unopenedProjection(), state: 'closed' };
        if (invariantError)
            throw invariantError;
    };
    return Object.freeze({ inspect, prepare, confirm, list, search, readPreview, close });
}
function normalizeSelection(selection: LegacySelection): LegacySelection {
    return {
        databasePath: path.resolve(selection.databasePath),
        assetRootDirectory: path.resolve(selection.assetRootDirectory),
        tildeRootDirectory: path.resolve(selection.tildeRootDirectory ?? selection.assetRootDirectory)
    };
}
async function assertPreparedReview(review: PreparedReview): Promise<void> {
    await assertSelectionUnchanged(review.selection, review.databaseNode, review.assetRootNode, review.tildeRootNode);
}
async function assertSelectionUnchanged(selection: LegacySelection, databaseNode: FileNode, assetRootNode: FileNode, tildeRootNode: FileNode): Promise<void> {
    assertNoRecoverySidecars(selection.databasePath);
    const [currentDatabase, currentAssetRoot, currentTildeRoot] = await Promise.all([
        regularFileNode(selection.databasePath),
        directoryNode(selection.assetRootDirectory),
        directoryNode(selection.tildeRootDirectory ?? selection.assetRootDirectory)
    ]);
    if (!sameFileNode(databaseNode, currentDatabase) ||
        !sameFileNode(assetRootNode, currentAssetRoot) ||
        !sameFileNode(tildeRootNode, currentTildeRoot)) {
        throw new Error('LEGACY_READONLY_REVIEW_STALE');
    }
}
function assertNoRecoverySidecars(databasePath: string): void {
    if (!sqliteRecoverySidecarsAbsent(databasePath))
        throw new Error('LEGACY_READONLY_DATABASE_UNAVAILABLE');
}
async function requireReady(database: Database.Database | null, active: PreparedReview | null): Promise<{
    db: Database.Database;
    selection: LegacySelection;
}> {
    if (!database?.open || !active)
        throw new Error('LEGACY_READONLY_NOT_READY');
    await assertPreparedReview(active);
    return { db: database, selection: active.selection };
}
async function resolvePreviewPath(reference: string, selection: LegacySelection): Promise<string> {
    if (typeof reference !== 'string' || reference.includes('\0')) {
        throw new Error('LEGACY_READONLY_PREVIEW_UNAVAILABLE');
    }
    const lexical = reference.startsWith('~/')
        ? path.resolve(selection.tildeRootDirectory ?? selection.assetRootDirectory, reference.slice(2))
        : path.resolve(reference);
    assertInside(selection.assetRootDirectory, lexical);
    const [realRoot, realCandidate] = await Promise.all([
        fs.realpath(selection.assetRootDirectory),
        fs.realpath(lexical)
    ]);
    assertInside(realRoot, realCandidate);
    const stat = await fs.lstat(realCandidate, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0n || stat.size > BigInt(MAX_PREVIEW_BYTES)) {
        throw new Error('LEGACY_READONLY_PREVIEW_UNAVAILABLE');
    }
    return realCandidate;
}
async function isSafePreviewCandidate(reference: string, selection: LegacySelection): Promise<boolean> {
    if (!reference)
        return false;
    try {
        await resolvePreviewPath(reference, selection);
        return true;
    }
    catch {
        return false;
    }
}
function assertInside(root: string, candidate: string): void {
    const relative = path.relative(root, candidate);
    if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)))
        return;
    throw new Error('LEGACY_READONLY_PREVIEW_UNAVAILABLE');
}
function isSupportedImage(bytes: Uint8Array): boolean {
    return isPng(bytes) || isJpeg(bytes) || isGif(bytes) || isWebp(bytes);
}
function isPng(bytes: Uint8Array): boolean {
    return bytes.length >= 8 &&
        Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}
function isJpeg(bytes: Uint8Array): boolean {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
function isGif(bytes: Uint8Array): boolean {
    const header = Buffer.from(bytes.subarray(0, 6)).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
}
function isWebp(bytes: Uint8Array): boolean {
    return bytes.length >= 12 &&
        Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' &&
        Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP';
}
function assertLegacySchema(database: Database.Database): void {
    if (database.pragma('quick_check(1)', { simple: true }) !== 'ok') {
        throw new Error('LEGACY_READONLY_DATABASE_INVALID');
    }
    const tables = database.prepare(`
    SELECT name
    FROM sqlite_schema
    WHERE type = 'table' AND name IN ('assets', 'tags', 'asset_tags')
    ORDER BY name
  `).all() as Array<{
        name: string;
    }>;
    if (tables.map((row) => row.name).join(',') !== 'asset_tags,assets,tags') {
        throw new Error('LEGACY_READONLY_SCHEMA_UNSUPPORTED');
    }
    const assetColumns = new Set((database.prepare('PRAGMA table_info(assets)').all() as Array<{
        name: string;
    }>)
        .map((row) => row.name));
    for (const name of ['id', 'title', 'file_name', 'thumbnail_path', 'created_at']) {
        if (!assetColumns.has(name))
            throw new Error('LEGACY_READONLY_SCHEMA_UNSUPPORTED');
    }
}
function readCounts(database: Database.Database) {
    return {
        assets: Number((database.prepare('SELECT COUNT(*) AS count FROM assets').get() as {
            count: number;
        }).count),
        tags: Number((database.prepare('SELECT COUNT(*) AS count FROM tags').get() as {
            count: number;
        }).count),
        relations: Number((database.prepare('SELECT COUNT(*) AS count FROM asset_tags').get() as {
            count: number;
        }).count)
    };
}
async function regularFileNode(filePath: string): Promise<FileNode> {
    const stat = await fs.lstat(filePath, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error('LEGACY_READONLY_DATABASE_INVALID');
    return toFileNode(stat);
}
async function directoryNode(directory: string): Promise<FileNode> {
    const stat = await fs.lstat(directory, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new Error('LEGACY_READONLY_DATABASE_INVALID');
    return toFileNode(stat);
}
function toFileNode(stat: {
    dev: bigint;
    ino: bigint;
    mode: bigint;
    size: bigint;
    mtimeNs: bigint;
}): FileNode {
    return { dev: stat.dev, ino: stat.ino, mode: stat.mode, size: stat.size, mtimeNs: stat.mtimeNs };
}
function sameFileNode(left: FileNode, right: FileNode): boolean {
    return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode &&
        left.size === right.size && left.mtimeNs === right.mtimeNs;
}
function unopenedProjection(): LegacyReadOnlyProjection {
    return {
        state: 'unconfigured',
        evidenceLevel: 'not-opened',
        identity: null,
        generation: null,
        counts: { assets: 0, tags: 0, relations: 0 },
        limitations: ['Select and confirm a legacy database and asset root before read-only inspection.']
    };
}
