import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { ConnectedCleanupCandidateProjection, ConnectedConflictProjection, ConnectedLibraryItemProjection, ConnectedLibraryProjection, ConnectedLibraryReview, ConnectedLibraryScope, ConnectedMetadataField, ConnectedMetadataPatch, ConnectedOperationProjection, ExternalConnectedLibrary } from '../../shared/contracts/external-connected-library.contract';
import type { ConnectedEditSelectionPort, EagleProviderConnection, EagleProviderItem, EagleProviderLookupResult, EagleProviderMutationResult, EagleProviderPort } from './eagle-provider.port';
import { assertExternalConnectedLibrarySchema, initializeExternalConnectedLibrarySchema } from './external-connected-library.schema';
const METADATA_FIELDS: readonly ConnectedMetadataField[] = ['name', 'tags', 'rating', 'annotation', 'folderIds'];
const ID = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u;
export type ExternalConnectedLibraryErrorCode = 'connected-library-not-ready' | 'connected-library-read-only' | 'connected-library-review-stale' | 'connected-library-provider-unavailable' | 'connected-library-identity-changed' | 'connected-library-generation-stale' | 'connected-library-item-unavailable' | 'connected-library-item-out-of-scope' | 'connected-library-request-invalid' | 'connected-library-staging-quota-exceeded' | 'connected-library-staging-failed' | 'connected-library-operation-unsupported' | 'connected-library-conflict-unavailable';
export class ExternalConnectedLibraryError extends Error {
    constructor(readonly code: ExternalConnectedLibraryErrorCode) {
        super(CONNECTED_ERROR_MESSAGES[code]);
        this.name = 'ExternalConnectedLibraryError';
    }
}
export interface CreateExternalConnectedLibraryInput {
    appOwnedRoot: string;
    databasePath: string;
    previewCacheDirectory: string;
    editStagingDirectory: string;
    previewCacheQuotaBytes: number;
    editStagingQuotaBytes: number;
    provider: EagleProviderPort;
    editSelection: ConnectedEditSelectionPort;
    createIdentity?(kind: string): string;
    now?(): Date;
    cleanupRetentionDays?: number;
}
interface ConnectionRow {
    state: ConnectedLibraryProjection['state'];
    evidenceLevel: ConnectedLibraryProjection['evidenceLevel'];
    providerIdentity: string | null;
    libraryIdentity: string | null;
    volumeIdentity: string | null;
    generation: string | null;
    displayName: string | null;
    scopeJson: string | null;
    grantLevel: ConnectedLibraryProjection['grant'];
    capabilitiesJson: string | null;
    cursor: string | null;
    scanToken: string | null;
    indexingComplete: number;
}
interface ItemRow {
    itemKey: string;
    providerIdentity: string;
    libraryIdentity: string;
    providerItemId: string;
    title: string;
    extension: string;
    tagsJson: string;
    rating: number;
    annotation: string;
    folderIdsJson: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    providerModifiedAt: number;
    providerVersion: string;
    contentFingerprint: string | null;
    previewRef: string | null;
    originalAvailability: ConnectedLibraryItemProjection['originalAvailability'];
    lifecycleState: ConnectedLibraryItemProjection['lifecycle'];
    syncState: ConnectedLibraryItemProjection['sync'];
    baseMetadataJson: string;
    trashedAt: string | null;
}
interface OperationRow {
    operationId: string;
    clientReceipt: string;
    itemKey: string;
    operationKind: ConnectedOperationProjection['kind'];
    operationState: ConnectedOperationProjection['state'];
    generation: string;
    expectedProviderVersion: string;
    baseJson: string;
    desiredJson: string;
    stagedRef: string | null;
    stagedDigest: string | null;
    stagedBytes: number | null;
    attemptCount: number;
    createdAt: string;
    updatedAt: string;
}
/**
 * Deep Main-owned Module for one Eagle-connected library. Eagle remains the
 * sole Original authority; this database stores projections, baselines,
 * outbox operations, conflicts and bounded temporary data only.
 */
export async function createExternalConnectedLibrary(input: CreateExternalConnectedLibraryInput): Promise<ExternalConnectedLibrary> {
    const root = path.resolve(input.appOwnedRoot);
    const databasePath = path.resolve(input.databasePath);
    const previews = path.resolve(input.previewCacheDirectory);
    const staging = path.resolve(input.editStagingDirectory);
    assertInside(root, databasePath);
    assertInside(root, previews);
    assertInside(root, staging);
    if (previews === staging || !Number.isSafeInteger(input.previewCacheQuotaBytes) || input.previewCacheQuotaBytes < 0 || !Number.isSafeInteger(input.editStagingQuotaBytes) || input.editStagingQuotaBytes < 0)
        throw connectedError('connected-library-request-invalid');
    await Promise.all([root, path.dirname(databasePath), previews, staging].map(ensureManagedDirectory));
    const database = new Database(databasePath);
    initializeExternalConnectedLibrarySchema(database);
    assertExternalConnectedLibrarySchema(database);
    const now = input.now ?? (() => new Date());
    const createIdentity = input.createIdentity ?? ((kind: string) => `${kind}:${randomUUID()}`);
    const retentionDays = input.cleanupRetentionDays ?? 30;
    let closed = false;
    let closing = false;
    let serial: Promise<void> = Promise.resolve();
    let closePromise: Promise<void> | null = null;
    let pendingReview: {
        review: ConnectedLibraryReview;
        connection: EagleProviderConnection;
    } | null = null;
    ensureConnectionRow(database, now);
    const inspect = (): ConnectedLibraryProjection => {
        assertOpen();
        const connection = readConnection(database);
        const counts = database.prepare(`
      SELECT
        COUNT(*) AS indexed,
        SUM(CASE WHEN lifecycle_state != 'out-of-scope' THEN 1 ELSE 0 END) AS inScope,
        SUM(CASE WHEN sync_state = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN sync_state = 'conflict' THEN 1 ELSE 0 END) AS conflicts,
        SUM(CASE WHEN lifecycle_state = 'trash' THEN 1 ELSE 0 END) AS trashed
      FROM connected_library_items
      WHERE library_identity = COALESCE(?, '')
    `).get(connection.libraryIdentity) as Record<string, number | null>;
        const cleanupCandidates = computeCleanupCandidates(database, now(), retentionDays).length;
        return {
            state: connection.state,
            evidenceLevel: connection.evidenceLevel,
            provider: 'eagle',
            providerIdentity: connection.providerIdentity,
            libraryIdentity: connection.libraryIdentity,
            generation: connection.generation,
            displayName: connection.displayName,
            originalAuthority: 'eagle-single-original',
            scope: decodeJson<ConnectedLibraryScope | null>(connection.scopeJson, null),
            grant: connection.grantLevel,
            capabilities: decodeJson(connection.capabilitiesJson, null),
            counts: {
                indexed: Number(counts.indexed ?? 0),
                inScope: Number(counts.inScope ?? 0),
                pending: Number(counts.pending ?? 0),
                conflicts: Number(counts.conflicts ?? 0),
                trashed: Number(counts.trashed ?? 0),
                cleanupCandidates
            },
            cursor: connection.cursor,
            indexingComplete: connection.indexingComplete === 1
        };
    };
    const prepareConnection: ExternalConnectedLibrary['prepareConnection'] = async ({ scope, requestedGrant }) => {
        assertOpen();
        validateScope(scope);
        if (requestedGrant !== 'read-only' && requestedGrant !== 'read-write')
            throw connectedError('connected-library-request-invalid');
        const connection = await input.provider.negotiate();
        if (!connection)
            return { kind: 'unavailable' };
        validateConnection(connection);
        const requestedCapabilities = connection.capabilities;
        const confirmable = requestedGrant === 'read-only'
            ? requestedCapabilities.metadataRead && requestedCapabilities.progressiveIndex
            : requestedCapabilities.metadataRead && requestedCapabilities.progressiveIndex && requestedCapabilities.metadataWrite;
        const review: ConnectedLibraryReview = Object.freeze({
            receipt: createIdentity('connected-review'),
            provider: 'eagle',
            displayName: connection.displayName,
            providerIdentity: connection.providerIdentity,
            libraryIdentity: connection.libraryIdentity,
            observedGeneration: connection.observedGeneration,
            scope: cloneScope(scope),
            capabilities: { ...requestedCapabilities },
            originalPolicy: 'eagle-remains-the-only-original-authority',
            localStoragePolicy: ['index-and-sync-journal', 'quota-bounded-rebuildable-preview-cache', 'pending-edit-staging-only'] as const,
            requestedGrant,
            confirmable,
            limitations: [
                'Eagle remains the only Original authority.',
                'Provider writes are verified before and after submission; they are not cross-application transactions.',
                'Permanent cleanup is unavailable unless the negotiated provider explicitly supports it.'
            ]
        });
        pendingReview = { review, connection };
        writeConnection(database, { ...readConnection(database), state: 'review-required', updatedAt: iso(now()) });
        return { kind: 'planned', review };
    };
    const confirmConnection: ExternalConnectedLibrary['confirmConnection'] = async (receipt) => {
        assertOpen();
        const replay = readReceipt<ConnectedLibraryProjection>(database, receipt, 'connection-confirmed');
        if (replay)
            return replay;
        if (!pendingReview || pendingReview.review.receipt !== receipt || !pendingReview.review.confirmable)
            throw connectedError('connected-library-review-stale');
        const current = await input.provider.negotiate();
        if (!current || !sameProviderConnection(current, pendingReview.connection))
            throw connectedError('connected-library-review-stale');
        const generation = createIdentity('connected-generation');
        const scanToken = createIdentity('connected-scan');
        const updatedAt = iso(now());
        writeConnection(database, {
            state: 'indexing', evidenceLevel: current.evidenceLevel,
            providerIdentity: current.providerIdentity, libraryIdentity: current.libraryIdentity,
            volumeIdentity: current.volumeIdentity, generation, displayName: current.displayName,
            scopeJson: JSON.stringify(pendingReview.review.scope), grantLevel: pendingReview.review.requestedGrant,
            capabilitiesJson: JSON.stringify(current.capabilities), cursor: null, scanToken,
            indexingComplete: 0, updatedAt
        });
        pendingReview = null;
        const projection = inspect();
        writeReceipt(database, receipt, 'connection-confirmed', projection, updatedAt);
        recordEvent(database, 'connection-confirmed', null, null, updatedAt);
        return projection;
    };
    const indexNextPage: ExternalConnectedLibrary['indexNextPage'] = async (requestedLimit = 100) => {
        assertOpen();
        const connection = requireConnection(database);
        const generation = connection.generation!;
        const limit = Number.isSafeInteger(requestedLimit) ? Math.max(1, Math.min(1000, requestedLimit)) : 100;
        const current = await requireSameConnection(connection);
        const scope = decodeJson<ConnectedLibraryScope>(connection.scopeJson, { kind: 'all' });
        const scanToken = connection.cursor === null && connection.indexingComplete === 1
            ? createIdentity('connected-scan')
            : connection.scanToken ?? createIdentity('connected-scan');
        const page = await input.provider.listPage({ cursor: connection.cursor, limit, scope });
        await assertRemoteConnectionStillMatches(connection, current);
        assertCurrentGeneration(generation);
        const updatedAt = iso(now());
        database.transaction(() => {
            for (const providerItem of page.items)
                upsertProviderItem(database, current, providerItem, scope, scanToken, updatedAt);
            writeConnection(database, {
                ...connection,
                state: 'indexing',
                cursor: page.nextCursor,
                scanToken,
                indexingComplete: 0,
                updatedAt
            });
        })();
        if (page.complete) {
            const observations = await observeMissingItems(database, current, scanToken, input.provider);
            await assertRemoteConnectionStillMatches(connection, current);
            assertCurrentGeneration(generation);
            database.transaction(() => {
                for (const observation of observations) {
                    if (observation.lookup.kind === 'found') {
                        upsertProviderItem(database, current, observation.lookup.item, scope, scanToken, updatedAt);
                    }
                    else if (observation.lookup.kind === 'missing') {
                        markMissingItem(database, observation.itemKey, updatedAt, createIdentity);
                    }
                }
                writeConnection(database, {
                    ...readConnection(database),
                    state: stateFromConflicts(database),
                    cursor: null,
                    scanToken,
                    indexingComplete: 1,
                    updatedAt
                });
            })();
        }
        return { indexed: page.items.length, nextCursor: page.nextCursor, complete: page.complete, projection: inspect() };
    };
    const listItems = async (): Promise<readonly ConnectedLibraryItemProjection[]> => {
        assertOpen();
        const connection = readConnection(database);
        if (!connection.libraryIdentity)
            return [];
        return readItemRows(database, connection.libraryIdentity).map(projectItem);
    };
    const searchItems = async (query: string): Promise<readonly ConnectedLibraryItemProjection[]> => {
        const value = normalizeText(query);
        return (await listItems()).filter((item) => !value || [item.title, item.annotation, ...item.tags].some((field) => normalizeText(field).includes(value)));
    };
    const queueMetadata: ExternalConnectedLibrary['queueMetadata'] = async ({ itemKey, clientReceipt, patch: metadataPatch }) => {
        assertOpen();
        const connection = requireWritableConnection(database);
        requireId(clientReceipt);
        const existing = findOperationByReceipt(database, clientReceipt);
        if (existing)
            return projectOperation(existing);
        const item = requireWritableItem(database, itemKey, false, connection.libraryIdentity!);
        const patch = validateMetadataPatch(metadataPatch);
        const nowText = iso(now());
        const operation = createOperationRow(createIdentity, item, clientReceipt, 'metadata', patch, readBaseMetadata(item), readConnection(database).generation!, nowText);
        insertOperation(database, operation);
        markItemSync(database, itemKey, 'pending', nowText);
        recordEvent(database, 'metadata-queued', itemKey, operation.operationId, nowText);
        return projectOperation(operation);
    };
    const prepareNewAsset: ExternalConnectedLibrary['prepareNewAsset'] = async (request = {}) => {
        assertOpen();
        const connection = requireWritableConnection(database);
        const selected = await input.editSelection.selectEditFile();
        if (selected.kind === 'cancelled')
            return selected;
        assertCurrentGeneration(connection.generation!);
        const scope = decodeJson<ConnectedLibraryScope>(connection.scopeJson, { kind: 'all' }), requested = request.metadata ? validateMetadataPatch(request.metadata) : {};
        const folderIds = requested.folderIds ?? (scope.kind === 'folders' ? [scope.folderIds[0]] : []);
        if (scope.kind === 'folders' && !folderIds.some((id) => scope.folderIds.includes(id)))
            throw connectedError('connected-library-item-out-of-scope');
        const clientReceipt = createIdentity('connected-add-receipt'), providerItemId = `dam-${hashText(clientReceipt).slice(0, 24)}`, itemKey = connectedItemKey(connection.providerIdentity!, connection.libraryIdentity!, providerItemId), nowText = iso(now());
        const stat = await fs.lstat(selected.filePath);
        if (!stat.isFile() || stat.isSymbolicLink())
            throw connectedError('connected-library-staging-failed');
        assertCurrentGeneration(connection.generation!);
        const metadata: ConnectedMetadataPatch = { name: requested.name ?? path.basename(selected.filePath, path.extname(selected.filePath)), tags: requested.tags ?? [], rating: requested.rating ?? 0, annotation: requested.annotation ?? '', folderIds };
        database.prepare(`INSERT INTO connected_library_items(item_key,provider_identity,library_identity,provider_item_id,title,extension,tags_json,rating,annotation,folder_ids_json,size_bytes,width,height,provider_modified_at,provider_version,content_fingerprint,preview_ref,original_availability,lifecycle_state,sync_state,base_metadata_json,last_seen_scan,trashed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(itemKey, connection.providerIdentity, connection.libraryIdentity, providerItemId, metadata.name, path.extname(selected.filePath).slice(1).toLowerCase() || 'unknown', JSON.stringify(metadata.tags), metadata.rating, metadata.annotation, JSON.stringify(folderIds), stat.size, null, null, 0, 'eagle-version:pending', null, null, connection.state === 'disconnected' ? 'offline' : 'available-through-provider', 'active', 'pending', JSON.stringify(metadata), connection.scanToken, null, nowText);
        try {
            let item = requireWritableItem(database, itemKey, false, connection.libraryIdentity!);
            const staged = await stageSelectedFile({ root, staging, filePath: selected.filePath, item, quota: input.editStagingQuotaBytes, database, now: now(), createIdentity });
            database.prepare('UPDATE connected_library_items SET content_fingerprint=?,size_bytes=?,updated_at=? WHERE item_key=?').run(staged.digest, staged.bytes, nowText, itemKey);
            item = requireWritableItem(database, itemKey, false, connection.libraryIdentity!);
            const operation = createOperationRow(createIdentity, item, clientReceipt, 'add-file', { ...metadata, contentFingerprint: staged.digest }, metadata, connection.generation!, nowText, staged);
            insertOperation(database, operation);
            recordEvent(database, 'add-file-staged', itemKey, operation.operationId, nowText);
            return { kind: 'staged', item: projectItem(item), operation: projectOperation(operation), stagedBytes: staged.bytes };
        }
        catch (error) {
            database.prepare('DELETE FROM connected_library_items WHERE item_key=? AND NOT EXISTS(SELECT 1 FROM connected_library_outbox WHERE item_key=?)').run(itemKey, itemKey);
            throw error;
        }
    };
    const prepareFileReplacement: ExternalConnectedLibrary['prepareFileReplacement'] = async ({ itemKey }) => {
        assertOpen();
        const connection = requireWritableConnection(database);
        const capabilities = decodeJson<EagleProviderConnection['capabilities'] | null>(connection.capabilitiesJson, null);
        if (!capabilities?.fileReplace)
            throw connectedError('connected-library-operation-unsupported');
        let item = requireWritableItem(database, itemKey, false, connection.libraryIdentity!);
        const currentConnection = await requireSameConnection(connection);
        const lookup = await input.provider.getItem(item.providerItemId);
        if (lookup.kind !== 'found' || !lookup.item.contentFingerprint) {
            throw connectedError('connected-library-provider-unavailable');
        }
        const remote = lookup.item;
        upsertProviderItem(database, currentConnection, remote, decodeJson<ConnectedLibraryScope>(connection.scopeJson, { kind: 'all' }), connection.scanToken ?? createIdentity('connected-scan'), iso(now()));
        item = requireWritableItem(database, itemKey, false, connection.libraryIdentity!);
        const selected = await input.editSelection.selectEditFile();
        if (selected.kind === 'cancelled')
            return { kind: 'cancelled' };
        await requireSameConnection(connection);
        assertCurrentGeneration(connection.generation!);
        const staged = await stageSelectedFile({ root, staging, filePath: selected.filePath, item, quota: input.editStagingQuotaBytes, database, now: now(), createIdentity });
        await requireSameConnection(connection);
        assertCurrentGeneration(connection.generation!);
        const receipt = createIdentity('connected-file-receipt');
        const nowText = iso(now());
        const operation = createOperationRow(createIdentity, item, receipt, 'replace-file', { contentFingerprint: staged.digest }, { contentFingerprint: remote.contentFingerprint }, connection.generation!, nowText, staged);
        insertOperation(database, operation);
        markItemSync(database, itemKey, 'pending', nowText);
        recordEvent(database, 'file-edit-staged', itemKey, operation.operationId, nowText);
        return { kind: 'staged', operation: projectOperation(operation), stagedBytes: staged.bytes };
    };
    const queueLifecycle: ExternalConnectedLibrary['queueLifecycle'] = async ({ itemKey, clientReceipt, action }) => {
        assertOpen();
        const connection = requireWritableConnection(database);
        requireId(clientReceipt);
        if (action !== 'trash' && action !== 'restore')
            throw connectedError('connected-library-request-invalid');
        const existing = findOperationByReceipt(database, clientReceipt);
        if (existing)
            return projectOperation(existing);
        const item = requireWritableItem(database, itemKey, action === 'restore', connection.libraryIdentity!);
        if ((action === 'trash' && item.lifecycleState !== 'active') || (action === 'restore' && item.lifecycleState !== 'trash'))
            throw connectedError('connected-library-request-invalid');
        const nowText = iso(now());
        const operation = createOperationRow(createIdentity, item, clientReceipt, action, { isDeleted: action === 'trash' }, readBaseMetadata(item), readConnection(database).generation!, nowText);
        insertOperation(database, operation);
        markItemSync(database, itemKey, 'pending', nowText);
        recordEvent(database, `${action}-queued`, itemKey, operation.operationId, nowText);
        return projectOperation(operation);
    };
    const synchronize: ExternalConnectedLibrary['synchronize'] = async (requestedLimit = 50) => {
        assertOpen();
        const connection = requireWritableConnection(database);
        let current: EagleProviderConnection;
        try {
            current = await requireSameConnection(connection);
        }
        catch (error) {
            if (error instanceof ExternalConnectedLibraryError && error.code === 'connected-library-provider-unavailable')
                return inspect();
            throw error;
        }
        const limit = Number.isSafeInteger(requestedLimit) ? Math.max(1, Math.min(500, requestedLimit)) : 50;
        const operations = readOperationRows(database).filter((operation) => operation.operationState === 'pending' || operation.operationState === 'checking').slice(0, limit);
        for (const operation of operations) {
            try {
                await synchronizeOperation(operation, current, false, connection.generation!);
            }
            catch (error) {
                if (error instanceof ExternalConnectedLibraryError && error.code === 'connected-library-provider-unavailable')
                    break;
                markOperation(database, operation.operationId, 'failed', operation.attemptCount + 1, iso(now()));
            }
        }
        const nextState = stateFromConflicts(database);
        writeConnection(database, { ...readConnection(database), state: nextState, updatedAt: iso(now()) });
        return inspect();
    };
    const listOperations = async () => readOperationRows(database).map(projectOperation);
    const listConflicts = async () => readConflictRows(database);
    const resolveConflict: ExternalConnectedLibrary['resolveConflict'] = async ({ conflictId, decision }) => {
        assertOpen();
        if (!ID.test(conflictId) || !['use-local', 'use-eagle', 'hold'].includes(decision))
            throw connectedError('connected-library-request-invalid');
        const conflict = readConflictRows(database).find((entry) => entry.conflictId === conflictId);
        if (!conflict || conflict.state === 'resolved')
            throw connectedError('connected-library-conflict-unavailable');
        const connection = requireWritableConnection(database);
        const operation = readOperation(database, conflict.operationId);
        const item = readItem(database, conflict.itemKey);
        if (!operation || !item)
            throw connectedError('connected-library-conflict-unavailable');
        const updatedAt = iso(now());
        if (decision === 'hold') {
            database.transaction(() => {
                database.prepare("UPDATE connected_library_conflicts SET conflict_state = 'held' WHERE conflict_id = ?")
                    .run(conflictId);
                database.prepare("UPDATE connected_library_outbox SET operation_state = 'held', updated_at = ? WHERE operation_id = ?")
                    .run(updatedAt, conflict.operationId);
                recordEvent(database, 'conflict-hold', conflict.itemKey, conflict.operationId, updatedAt);
            })();
            return readConflictRows(database).find((entry) => entry.conflictId === conflictId)!;
        }
        const expectedConnection = await requireSameConnection(connection);
        const lookup = await input.provider.getItem(item.providerItemId);
        if (lookup.kind !== 'found')
            throw connectedError('connected-library-item-unavailable');
        await assertRemoteConnectionStillMatches(connection, expectedConnection);
        assertCurrentGeneration(connection.generation!);
        const remote = lookup.item;
        let releaseStagedRef: string | null = null;
        database.transaction(() => {
            database.prepare("UPDATE connected_library_conflicts SET conflict_state = 'resolved', resolved_at = ? WHERE conflict_id = ?")
                .run(updatedAt, conflictId);
            if (conflict.kind === 'field' && conflict.field) {
                resolveMetadataField(database, operation, conflict.field, decision, remote, updatedAt);
            }
            else if (decision === 'use-local') {
                const nextBase = conflict.kind === 'file'
                    ? { contentFingerprint: remote.contentFingerprint }
                    : providerMetadata(remote);
                database.prepare(`
            UPDATE connected_library_outbox
            SET expected_provider_version = ?, base_json = ?, updated_at = ?
            WHERE operation_id = ?
          `).run(remote.version, JSON.stringify(nextBase), updatedAt, operation.operationId);
                resolveOperationConflictsIfComplete(database, operation.operationId, 'pending', updatedAt);
            }
            else {
                completeOperation(database, operation, remote, 'committed', updatedAt);
                releaseStagedRef = operation.stagedRef;
            }
            recordEvent(database, `conflict-${decision}`, conflict.itemKey, conflict.operationId, updatedAt);
        })();
        if (releaseStagedRef)
            await releaseStagedFile(database, staging, releaseStagedRef, updatedAt);
        return readConflictRows(database).find((entry) => entry.conflictId === conflictId)!;
    };
    const listCleanupCandidates = async () => computeCleanupCandidates(database, now(), retentionDays);
    const confirmPermanentCleanup: ExternalConnectedLibrary['confirmPermanentCleanup'] = async ({ itemKey, clientReceipt }) => {
        assertOpen();
        const connection = requireWritableConnection(database);
        requireId(clientReceipt);
        const existing = findOperationByReceipt(database, clientReceipt);
        if (existing)
            return projectOperation(existing);
        const capabilities = decodeJson<EagleProviderConnection['capabilities'] | null>(connection.capabilitiesJson, null);
        const candidate = computeCleanupCandidates(database, now(), retentionDays).find((entry) => entry.itemKey === itemKey);
        if (!candidate || !candidate.confirmable || !capabilities?.permanentDelete)
            throw connectedError('connected-library-operation-unsupported');
        const item = requireWritableItem(database, itemKey, true, connection.libraryIdentity!);
        const nowText = iso(now());
        const operation = createOperationRow(createIdentity, item, clientReceipt, 'trash', { permanent: true }, readBaseMetadata(item), connection.generation!, nowText);
        insertOperation(database, operation);
        await synchronizeOperation(operation, await requireSameConnection(connection), true, connection.generation!);
        return projectOperation(readOperation(database, operation.operationId)!);
    };
    const readPreview = async (itemKey: string): Promise<Uint8Array> => {
        assertOpen();
        const connection = requireConnection(database);
        const item = readItem(database, itemKey);
        if (!item || item.lifecycleState === 'tombstone' || item.lifecycleState === 'out-of-scope')
            throw connectedError('connected-library-item-unavailable');
        if (item.previewRef) {
            const cached = await readCachedPreview(previews, item.previewRef);
            if (cached)
                return cached;
        }
        const bytes = await input.provider.readPreview(item.providerItemId);
        await requireSameConnection(connection);
        assertCurrentGeneration(connection.generation!);
        if (!bytes || bytes.byteLength === 0)
            throw connectedError('connected-library-provider-unavailable');
        const cachedRef = await cachePreview(previews, bytes, input.previewCacheQuotaBytes);
        if (cachedRef)
            database.prepare('UPDATE connected_library_items SET preview_ref = ?, updated_at = ? WHERE item_key = ?').run(cachedRef, iso(now()), itemKey);
        return new Uint8Array(bytes);
    };
    const disconnect = async () => {
        assertOpen();
        await input.provider.disconnect();
        database.prepare("UPDATE connected_library_connection SET state = 'disconnected', generation = ?, updated_at = ? WHERE singleton = 1").run(createIdentity('connected-generation'), iso(now()));
        database.prepare("UPDATE connected_library_items SET original_availability = CASE WHEN lifecycle_state = 'tombstone' THEN 'permanently-missing' ELSE 'offline' END").run();
    };
    const close = async () => {
        if (closed)
            return;
        try {
            await input.provider.disconnect();
        }
        finally {
            database.pragma('wal_checkpoint(TRUNCATE)');
            database.close();
            closed = true;
        }
    };
    const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
        if (closing || closed)
            return Promise.reject(connectedError('connected-library-not-ready'));
        const result = serial.then(operation);
        serial = result.then(() => undefined, () => undefined);
        return result;
    };
    const closeSerialized = (): Promise<void> => {
        if (closePromise)
            return closePromise;
        closing = true;
        closePromise = serial.then(close);
        serial = closePromise.then(() => undefined, () => undefined);
        return closePromise;
    };
    const publicHost: ExternalConnectedLibrary = {
        inspect: () => {
            if (closing)
                throw connectedError('connected-library-not-ready');
            return inspect();
        },
        prepareConnection: (request) => enqueue(() => prepareConnection(request)),
        confirmConnection: (receipt) => enqueue(() => confirmConnection(receipt)),
        indexNextPage: (limit) => enqueue(() => indexNextPage(limit)),
        listItems: () => enqueue(listItems),
        searchItems: (query) => enqueue(() => searchItems(query)),
        queueMetadata: (request) => enqueue(() => queueMetadata(request)),
        prepareNewAsset: (request) => enqueue(() => prepareNewAsset(request)),
        prepareFileReplacement: (request) => enqueue(() => prepareFileReplacement(request)),
        queueLifecycle: (request) => enqueue(() => queueLifecycle(request)),
        synchronize: (limit) => enqueue(() => synchronize(limit)),
        listOperations: () => enqueue(listOperations),
        listConflicts: () => enqueue(listConflicts),
        resolveConflict: (request) => enqueue(() => resolveConflict(request)),
        listCleanupCandidates: () => enqueue(listCleanupCandidates),
        confirmPermanentCleanup: (request) => enqueue(() => confirmPermanentCleanup(request)),
        readPreview: (itemKey) => enqueue(() => readPreview(itemKey)),
        disconnect: () => enqueue(disconnect),
        close: closeSerialized
    };
    return Object.freeze(publicHost);
    async function requireSameConnection(connection: ConnectionRow): Promise<EagleProviderConnection> {
        const current = await input.provider.negotiate();
        if (!current) {
            writeConnection(database, { ...connection, state: 'disconnected', generation: createIdentity('connected-generation'), updatedAt: iso(now()) });
            database.prepare("UPDATE connected_library_items SET original_availability = CASE WHEN lifecycle_state = 'tombstone' THEN 'permanently-missing' ELSE 'offline' END").run();
            throw connectedError('connected-library-provider-unavailable');
        }
        if (current.providerIdentity !== connection.providerIdentity || current.libraryIdentity !== connection.libraryIdentity || current.volumeIdentity !== connection.volumeIdentity) {
            createGlobalConflict(database, current.libraryIdentity !== connection.libraryIdentity ? 'library-changed' : 'volume-changed', iso(now()), createIdentity);
            writeConnection(database, { ...connection, state: 'conflict', generation: createIdentity('connected-generation'), updatedAt: iso(now()) });
            throw connectedError('connected-library-identity-changed');
        }
        return current;
    }
    async function assertRemoteConnectionStillMatches(saved: ConnectionRow, expected: EagleProviderConnection): Promise<void> {
        const observed = await input.provider.negotiate();
        if (!observed || !sameProviderIdentity(observed, expected)) {
            assertCurrentGeneration(saved.generation!);
            const updatedAt = iso(now());
            if (!observed) {
                writeConnection(database, {
                    ...readConnection(database),
                    state: 'disconnected',
                    generation: createIdentity('connected-generation'),
                    updatedAt
                });
                throw connectedError('connected-library-provider-unavailable');
            }
            createGlobalConflict(database, observed.libraryIdentity !== saved.libraryIdentity ? 'library-changed' : 'volume-changed', updatedAt, createIdentity);
            writeConnection(database, {
                ...readConnection(database),
                state: 'conflict',
                generation: createIdentity('connected-generation'),
                updatedAt
            });
            throw connectedError('connected-library-identity-changed');
        }
    }
    function assertCurrentGeneration(generation: string): void {
        if (closed || readConnection(database).generation !== generation) {
            throw connectedError('connected-library-generation-stale');
        }
    }
    async function synchronizeOperation(operation: OperationRow, connection: EagleProviderConnection, permanent = false, hostGeneration = readConnection(database).generation!): Promise<void> {
        const item = readItem(database, operation.itemKey);
        if (!item || item.libraryIdentity !== connection.libraryIdentity || item.lifecycleState === 'out-of-scope') {
            createConflict(database, operation, 'library-changed', null, 'Local queued change', 'Eagle library or scope changed', iso(now()), createIdentity);
            return;
        }
        const lookup = await input.provider.getItem(item.providerItemId);
        assertCurrentGeneration(hostGeneration);
        if (lookup.kind === 'unavailable') {
            throw connectedError('connected-library-provider-unavailable');
        }
        if (operation.operationKind === 'add-file') {
            await synchronizeAdd(operation, item, lookup, hostGeneration);
            return;
        }
        if (lookup.kind === 'missing') {
            markTombstone(database, item.itemKey, operation.operationId, iso(now()), createIdentity);
            return;
        }
        const remote = lookup.item;
        markOperation(database, operation.operationId, 'checking', operation.attemptCount + 1, iso(now()));
        if (permanent) {
            await finishProviderMutation(operation, await input.provider.permanentlyDelete(item.providerItemId), { permanent: true, hostGeneration });
        }
        else if (operation.operationKind === 'metadata') {
            await synchronizeMetadata(operation, item, remote, hostGeneration);
        }
        else if (operation.operationKind === 'replace-file') {
            await synchronizeFile(operation, item, remote, hostGeneration);
        }
        else {
            await synchronizeLifecycle(operation, item, remote, hostGeneration);
        }
    }
    async function synchronizeAdd(operation: OperationRow, item: ItemRow, lookup: EagleProviderLookupResult, hostGeneration: string): Promise<void> {
        if (!operation.stagedRef || !operation.stagedDigest)
            throw connectedError('connected-library-staging-failed');
        if (lookup.kind === 'unavailable')
            throw connectedError('connected-library-provider-unavailable');
        if (lookup.kind === 'found') {
            const remote = lookup.item;
            if (remote.contentFingerprint === operation.stagedDigest) {
                completeOperation(database, operation, remote, 'committed', iso(now()));
                await releaseStagedFile(database, staging, operation.stagedRef, iso(now()));
                return;
            }
            createConflict(database, operation, 'file', null, 'New local staged asset', 'Eagle custom item ID already exists', iso(now()), createIdentity);
            return;
        }
        const stagedPath = await resolveStagedFile(database, staging, operation.stagedRef, operation.stagedDigest);
        const desired = decodeJson<ConnectedMetadataPatch>(operation.desiredJson, {});
        await finishProviderMutation(operation, await input.provider.addFile(item.providerItemId, stagedPath, desired), { desiredFingerprint: operation.stagedDigest, stagedRef: operation.stagedRef, addOperation: true, hostGeneration });
    }
    async function synchronizeMetadata(operation: OperationRow, item: ItemRow, remote: EagleProviderItem, hostGeneration: string): Promise<void> {
        const base = decodeJson<Record<string, unknown>>(operation.baseJson, {});
        const desired = decodeJson<ConnectedMetadataPatch>(operation.desiredJson, {});
        const remoteMetadata = providerMetadata(remote);
        const patch: ConnectedMetadataPatch = {};
        for (const field of METADATA_FIELDS) {
            if (!(field in desired))
                continue;
            const localValue = desired[field];
            const baseValue = base[field];
            const remoteValue = remoteMetadata[field];
            if (!sameValue(remoteValue, baseValue) && !sameValue(remoteValue, localValue)) {
                createConflict(database, operation, 'field', field, summarizeValue(localValue), summarizeValue(remoteValue), iso(now()), createIdentity);
            }
            else if (!sameValue(remoteValue, localValue)) {
                Object.assign(patch, { [field]: localValue });
            }
        }
        if (Object.keys(patch).length === 0) {
            const hasConflicts = operationHasUnresolvedConflicts(database, operation.operationId);
            completeOperation(database, operation, remote, hasConflicts ? 'conflict' : 'committed', iso(now()));
            return;
        }
        await finishProviderMutation(operation, await input.provider.updateMetadata(item.providerItemId, patch), { desiredPatch: patch, hostGeneration });
    }
    async function synchronizeFile(operation: OperationRow, item: ItemRow, remote: EagleProviderItem, hostGeneration: string): Promise<void> {
        if (!operation.stagedRef || !operation.stagedDigest)
            throw connectedError('connected-library-staging-failed');
        if (remote.contentFingerprint === operation.stagedDigest) {
            completeOperation(database, operation, remote, 'committed', iso(now()));
            await releaseStagedFile(database, staging, operation.stagedRef, iso(now()));
            return;
        }
        const baseline = decodeJson<{
            contentFingerprint?: string;
        }>(operation.baseJson, {});
        if (!remote.contentFingerprint || !baseline.contentFingerprint ||
            remote.contentFingerprint !== baseline.contentFingerprint) {
            createConflict(database, operation, 'file', null, 'Local staged file', 'Eagle file changed', iso(now()), createIdentity);
            return;
        }
        const stagedPath = await resolveStagedFile(database, staging, operation.stagedRef, operation.stagedDigest);
        await finishProviderMutation(operation, await input.provider.replaceFile(item.providerItemId, stagedPath, baseline.contentFingerprint, operation.stagedDigest), { desiredFingerprint: operation.stagedDigest, stagedRef: operation.stagedRef, hostGeneration });
    }
    async function synchronizeLifecycle(operation: OperationRow, item: ItemRow, remote: EagleProviderItem, hostGeneration: string): Promise<void> {
        const desiredDeleted = operation.operationKind === 'trash';
        if (remote.isDeleted === desiredDeleted) {
            completeOperation(database, operation, remote, 'committed', iso(now()), desiredDeleted);
            return;
        }
        if (remote.version !== operation.expectedProviderVersion) {
            createConflict(database, operation, 'delete-versus-edit', null, desiredDeleted ? 'Move to Trash' : 'Restore', 'Eagle item changed', iso(now()), createIdentity);
            return;
        }
        await finishProviderMutation(operation, await input.provider.setDeleted(item.providerItemId, desiredDeleted), { desiredDeleted, hostGeneration });
    }
    async function finishProviderMutation(operation: OperationRow, result: EagleProviderMutationResult, expectation: {
        desiredPatch?: ConnectedMetadataPatch;
        desiredFingerprint?: string;
        desiredDeleted?: boolean;
        stagedRef?: string;
        permanent?: boolean;
        addOperation?: boolean;
        hostGeneration: string;
    }): Promise<void> {
        await requireSameConnection(requireConnection(database));
        assertCurrentGeneration(expectation.hostGeneration);
        if (result.kind === 'unsupported')
            throw connectedError('connected-library-operation-unsupported');
        if (result.kind === 'unavailable')
            throw connectedError('connected-library-provider-unavailable');
        if (result.kind === 'conflict') {
            createConflict(database, operation, operation.operationKind === 'replace-file' || operation.operationKind === 'add-file' ? 'file' : 'result-uncertain', null, 'Local queued change', 'Eagle changed during verification', iso(now()), createIdentity);
            return;
        }
        if (result.kind === 'rejected') {
            markOperation(database, operation.operationId, 'failed', operation.attemptCount + 1, iso(now()));
            return;
        }
        const verifiedLookup: EagleProviderLookupResult = result.kind === 'applied'
            ? { kind: 'found', item: result.item }
            : await input.provider.getItem(readItem(database, operation.itemKey)!.providerItemId);
        if (expectation.permanent) {
            if (verifiedLookup.kind === 'missing') {
                const item = readItem(database, operation.itemKey)!;
                database.prepare("UPDATE connected_library_items SET lifecycle_state = 'tombstone', original_availability = 'permanently-missing', sync_state = 'clean', updated_at = ? WHERE item_key = ?").run(iso(now()), item.itemKey);
                markOperation(database, operation.operationId, 'committed', operation.attemptCount + 1, iso(now()));
            }
            else if (verifiedLookup.kind === 'found') {
                createConflict(database, operation, 'result-uncertain', null, 'Permanent cleanup requested', 'Eagle item still observable', iso(now()), createIdentity);
            }
            else {
                createConflict(database, operation, 'result-uncertain', null, 'Permanent cleanup requested', 'Eagle result unavailable', iso(now()), createIdentity);
            }
            return;
        }
        if (verifiedLookup.kind !== 'found') {
            createConflict(database, operation, 'result-uncertain', null, 'Local queued change', 'Eagle result unavailable', iso(now()), createIdentity);
            return;
        }
        const verified = verifiedLookup.item;
        const satisfied = expectation.desiredPatch
            ? metadataContains(providerMetadata(verified), expectation.desiredPatch)
            : expectation.desiredFingerprint
                ? verified.contentFingerprint === expectation.desiredFingerprint
                : verified.isDeleted === expectation.desiredDeleted;
        if (!satisfied) {
            if (result.kind === 'timeout') {
                markOperation(database, operation.operationId, 'pending', operation.attemptCount + 1, iso(now()));
                return;
            }
            createConflict(database, operation, 'result-uncertain', null, 'Local queued change', 'Eagle read-back differs', iso(now()), createIdentity);
            return;
        }
        completeOperation(database, operation, verified, operationHasUnresolvedConflicts(database, operation.operationId) ? 'conflict' : 'committed', iso(now()), expectation.desiredDeleted);
        if (expectation.stagedRef)
            await releaseStagedFile(database, staging, expectation.stagedRef, iso(now()));
    }
    function assertOpen(): void {
        if (closed || !database.open)
            throw connectedError('connected-library-not-ready');
    }
}
function ensureConnectionRow(database: Database.Database, now: () => Date): void {
    database.prepare(`INSERT OR IGNORE INTO connected_library_connection
    (singleton, record_version, state, evidence_level, grant_level, indexing_complete, updated_at)
    VALUES (1, 1, 'unconfigured', 'not-connected', 'none', 0, ?)`).run(iso(now()));
}
function readConnection(database: Database.Database): ConnectionRow {
    return database.prepare(`SELECT state, evidence_level AS evidenceLevel, provider_identity AS providerIdentity,
    library_identity AS libraryIdentity, volume_identity AS volumeIdentity, generation, display_name AS displayName,
    scope_json AS scopeJson, grant_level AS grantLevel, capabilities_json AS capabilitiesJson, cursor,
    scan_token AS scanToken, indexing_complete AS indexingComplete FROM connected_library_connection WHERE singleton = 1`).get() as ConnectionRow;
}
function writeConnection(database: Database.Database, row: ConnectionRow & {
    updatedAt: string;
}): void {
    database.prepare(`UPDATE connected_library_connection SET state=?, evidence_level=?, provider_identity=?, library_identity=?,
    volume_identity=?, generation=?, display_name=?, scope_json=?, grant_level=?, capabilities_json=?, cursor=?, scan_token=?,
    indexing_complete=?, updated_at=? WHERE singleton=1`).run(row.state, row.evidenceLevel, row.providerIdentity, row.libraryIdentity, row.volumeIdentity, row.generation, row.displayName, row.scopeJson, row.grantLevel, row.capabilitiesJson, row.cursor, row.scanToken, row.indexingComplete, row.updatedAt);
}
function requireConnection(database: Database.Database): ConnectionRow {
    const connection = readConnection(database);
    if (!connection.libraryIdentity || !connection.generation || !connection.providerIdentity || !connection.volumeIdentity || !connection.scopeJson || !connection.capabilitiesJson || connection.grantLevel === 'none')
        throw connectedError('connected-library-not-ready');
    return connection;
}
function requireWritableConnection(database: Database.Database): ConnectionRow {
    const connection = requireConnection(database);
    if (connection.grantLevel !== 'read-write')
        throw connectedError('connected-library-read-only');
    return connection;
}
function readItemRows(database: Database.Database, libraryIdentity: string): ItemRow[] {
    return database.prepare(`SELECT item_key AS itemKey, provider_identity AS providerIdentity, library_identity AS libraryIdentity,
    provider_item_id AS providerItemId, title, extension, tags_json AS tagsJson, rating, annotation,
    folder_ids_json AS folderIdsJson, size_bytes AS sizeBytes, width, height, provider_modified_at AS providerModifiedAt,
    provider_version AS providerVersion, content_fingerprint AS contentFingerprint, preview_ref AS previewRef,
    original_availability AS originalAvailability, lifecycle_state AS lifecycleState, sync_state AS syncState,
    base_metadata_json AS baseMetadataJson, trashed_at AS trashedAt
    FROM connected_library_items WHERE library_identity=? ORDER BY title, item_key`).all(libraryIdentity) as ItemRow[];
}
function readItem(database: Database.Database, itemKey: string): ItemRow | null {
    if (!ID.test(itemKey))
        return null;
    return database.prepare(`SELECT item_key AS itemKey, provider_identity AS providerIdentity, library_identity AS libraryIdentity,
    provider_item_id AS providerItemId, title, extension, tags_json AS tagsJson, rating, annotation,
    folder_ids_json AS folderIdsJson, size_bytes AS sizeBytes, width, height, provider_modified_at AS providerModifiedAt,
    provider_version AS providerVersion, content_fingerprint AS contentFingerprint, preview_ref AS previewRef,
    original_availability AS originalAvailability, lifecycle_state AS lifecycleState, sync_state AS syncState,
    base_metadata_json AS baseMetadataJson, trashed_at AS trashedAt
    FROM connected_library_items WHERE item_key=?`).get(itemKey) as ItemRow | undefined ?? null;
}
function requireWritableItem(database: Database.Database, itemKey: string, allowTrash = false, expectedLibraryIdentity?: string): ItemRow {
    const item = readItem(database, itemKey);
    if (!item)
        throw connectedError('connected-library-item-unavailable');
    if (expectedLibraryIdentity && item.libraryIdentity !== expectedLibraryIdentity)
        throw connectedError('connected-library-generation-stale');
    if (item.lifecycleState === 'out-of-scope')
        throw connectedError('connected-library-item-out-of-scope');
    if (item.lifecycleState === 'tombstone' || (!allowTrash && item.lifecycleState === 'trash'))
        throw connectedError('connected-library-item-unavailable');
    return item;
}
function projectItem(row: ItemRow): ConnectedLibraryItemProjection {
    return {
        key: row.itemKey, providerItemId: row.providerItemId, title: row.title, extension: row.extension,
        tags: decodeJson(row.tagsJson, []), rating: row.rating, annotation: row.annotation,
        folderIds: decodeJson(row.folderIdsJson, []), size: row.sizeBytes, width: row.width, height: row.height,
        providerModifiedAt: row.providerModifiedAt, providerVersion: row.providerVersion,
        contentFingerprint: row.contentFingerprint, previewRef: row.previewRef,
        originalAvailability: row.originalAvailability, lifecycle: row.lifecycleState, sync: row.syncState
    };
}
function upsertProviderItem(database: Database.Database, connection: EagleProviderConnection, item: EagleProviderItem, scope: ConnectedLibraryScope, scanToken: string, now: string): void {
    validateProviderItem(item);
    const itemKey = connectedItemKey(connection.providerIdentity, connection.libraryIdentity, item.id);
    const existing = readItem(database, itemKey);
    const inScope = matchesScope(item.folderIds, scope);
    const lifecycle = inScope ? (item.isDeleted ? 'trash' : 'active') : 'out-of-scope';
    const sync = existing && readOperationRows(database).some((operation) => operation.itemKey === itemKey && !['committed', 'failed'].includes(operation.operationState)) ? existing.syncState : 'clean';
    const base = providerMetadata(item);
    database.prepare(`INSERT INTO connected_library_items
    (item_key,provider_identity,library_identity,provider_item_id,title,extension,tags_json,rating,annotation,folder_ids_json,
      size_bytes,width,height,provider_modified_at,provider_version,content_fingerprint,preview_ref,original_availability,
      lifecycle_state,sync_state,base_metadata_json,last_seen_scan,trashed_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'available-through-provider',?,?,?,?,?,?)
    ON CONFLICT(item_key) DO UPDATE SET title=excluded.title, extension=excluded.extension, tags_json=excluded.tags_json,
      rating=excluded.rating, annotation=excluded.annotation, folder_ids_json=excluded.folder_ids_json,
      size_bytes=excluded.size_bytes,width=excluded.width,height=excluded.height,provider_modified_at=excluded.provider_modified_at,
      provider_version=excluded.provider_version,content_fingerprint=excluded.content_fingerprint,
      original_availability=excluded.original_availability,lifecycle_state=excluded.lifecycle_state,
      base_metadata_json=CASE WHEN connected_library_items.sync_state='clean' THEN excluded.base_metadata_json ELSE connected_library_items.base_metadata_json END,
      last_seen_scan=excluded.last_seen_scan,trashed_at=CASE WHEN excluded.lifecycle_state='trash' THEN COALESCE(connected_library_items.trashed_at,excluded.trashed_at) ELSE NULL END,
      updated_at=excluded.updated_at`).run(itemKey, connection.providerIdentity, connection.libraryIdentity, item.id, item.name, item.extension, JSON.stringify(item.tags), item.rating, item.annotation, JSON.stringify(item.folderIds), item.size, item.width, item.height, item.modifiedAt, item.version, item.contentFingerprint, existing?.previewRef ?? null, lifecycle, sync, JSON.stringify(base), scanToken, item.isDeleted ? providerTrashTime(item.modifiedAt, now) : null, now);
}
async function observeMissingItems(database: Database.Database, connection: EagleProviderConnection, scanToken: string, provider: EagleProviderPort): Promise<Array<{
    itemKey: string;
    lookup: EagleProviderLookupResult;
}>> {
    const candidates = database.prepare(`
    SELECT item_key AS itemKey, provider_item_id AS providerItemId
    FROM connected_library_items
    WHERE library_identity = ?
      AND lifecycle_state != 'out-of-scope'
      AND COALESCE(last_seen_scan, '') != ?
      AND NOT EXISTS (
        SELECT 1 FROM connected_library_outbox o
        WHERE o.item_key = connected_library_items.item_key
          AND o.operation_kind = 'add-file'
          AND o.operation_state NOT IN ('committed', 'failed')
      )
  `).all(connection.libraryIdentity, scanToken) as Array<{
        itemKey: string;
        providerItemId: string;
    }>;
    return Promise.all(candidates.map(async (candidate) => ({
        itemKey: candidate.itemKey,
        lookup: await provider.getItem(candidate.providerItemId)
    })));
}
function markMissingItem(database: Database.Database, itemKey: string, now: string, createIdentity: (kind: string) => string): void {
    const pending = readOperationRows(database).find((operation) => operation.itemKey === itemKey && !['committed', 'failed'].includes(operation.operationState));
    database.prepare(`
    UPDATE connected_library_items
    SET lifecycle_state = 'tombstone',
        original_availability = 'permanently-missing',
        sync_state = ?,
        updated_at = ?
    WHERE item_key = ?
  `).run(pending ? 'conflict' : 'clean', now, itemKey);
    if (pending) {
        createConflict(database, pending, 'delete-versus-edit', null, 'Local queued change', 'Eagle Original permanently missing', now, createIdentity);
    }
}
function readOperationRows(database: Database.Database): OperationRow[] {
    return database.prepare(`SELECT operation_id AS operationId, client_receipt AS clientReceipt, item_key AS itemKey,
    operation_kind AS operationKind, operation_state AS operationState, generation, expected_provider_version AS expectedProviderVersion,
    base_json AS baseJson, desired_json AS desiredJson, staged_ref AS stagedRef, staged_digest AS stagedDigest,
    staged_bytes AS stagedBytes, attempt_count AS attemptCount, created_at AS createdAt, updated_at AS updatedAt
    FROM connected_library_outbox ORDER BY created_at, operation_id`).all() as OperationRow[];
}
function readOperation(database: Database.Database, operationId: string): OperationRow | null {
    return readOperationRows(database).find((operation) => operation.operationId === operationId) ?? null;
}
function findOperationByReceipt(database: Database.Database, receipt: string): OperationRow | null {
    return readOperationRows(database).find((operation) => operation.clientReceipt === receipt) ?? null;
}
function createOperationRow(createIdentity: (kind: string) => string, item: ItemRow, receipt: string, kind: ConnectedOperationProjection['kind'], desired: unknown, base: unknown, generation: string, now: string, staged?: {
    ref: string;
    digest: string;
    bytes: number;
}): OperationRow {
    return {
        operationId: createIdentity('connected-operation'), clientReceipt: receipt, itemKey: item.itemKey,
        operationKind: kind, operationState: 'pending', generation, expectedProviderVersion: item.providerVersion,
        baseJson: JSON.stringify(base), desiredJson: JSON.stringify(desired), stagedRef: staged?.ref ?? null,
        stagedDigest: staged?.digest ?? null, stagedBytes: staged?.bytes ?? null, attemptCount: 0, createdAt: now, updatedAt: now
    };
}
function insertOperation(database: Database.Database, row: OperationRow): void {
    database.prepare(`INSERT INTO connected_library_outbox
    (operation_id,client_receipt,item_key,operation_kind,operation_state,generation,expected_provider_version,
      base_json,desired_json,staged_ref,staged_digest,staged_bytes,attempt_count,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(row.operationId, row.clientReceipt, row.itemKey, row.operationKind, row.operationState, row.generation, row.expectedProviderVersion, row.baseJson, row.desiredJson, row.stagedRef, row.stagedDigest, row.stagedBytes, row.attemptCount, row.createdAt, row.updatedAt);
}
function projectOperation(row: OperationRow): ConnectedOperationProjection {
    return { operationId: row.operationId, clientReceipt: row.clientReceipt, itemKey: row.itemKey, kind: row.operationKind,
        state: row.operationState, attemptCount: row.attemptCount, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
function markOperation(database: Database.Database, id: string, state: ConnectedOperationProjection['state'], attempts: number, updatedAt: string): void {
    database.prepare('UPDATE connected_library_outbox SET operation_state=?, attempt_count=?, updated_at=? WHERE operation_id=?').run(state, attempts, updatedAt, id);
}
function completeOperation(database: Database.Database, operation: OperationRow, remote: EagleProviderItem, state: ConnectedOperationProjection['state'], now: string, desiredDeleted?: boolean): void {
    database.transaction(() => {
        markOperation(database, operation.operationId, state, operation.attemptCount + 1, now);
        database.prepare(`UPDATE connected_library_items SET title=?,extension=?,tags_json=?,rating=?,annotation=?,folder_ids_json=?,
      size_bytes=?,width=?,height=?,provider_modified_at=?,provider_version=?,content_fingerprint=?,
      original_availability='available-through-provider', lifecycle_state=?,sync_state=?,base_metadata_json=?,
      trashed_at=?,updated_at=? WHERE item_key=?`).run(remote.name, remote.extension, JSON.stringify(remote.tags), remote.rating, remote.annotation, JSON.stringify(remote.folderIds), remote.size, remote.width, remote.height, remote.modifiedAt, remote.version, remote.contentFingerprint, desiredDeleted === true ? 'trash' : desiredDeleted === false ? 'active' : (remote.isDeleted ? 'trash' : 'active'), state === 'conflict' ? 'conflict' : 'clean', JSON.stringify(providerMetadata(remote)), remote.isDeleted ? now : null, now, operation.itemKey);
        recordEvent(database, `operation-${state}`, operation.itemKey, operation.operationId, now);
    })();
}
function markItemSync(database: Database.Database, itemKey: string, state: ConnectedLibraryItemProjection['sync'], now: string): void {
    database.prepare('UPDATE connected_library_items SET sync_state=?,updated_at=? WHERE item_key=?').run(state, now, itemKey);
}
function readConflictRows(database: Database.Database): ConnectedConflictProjection[] {
    return database.prepare(`SELECT conflict_id AS conflictId,item_key AS itemKey,operation_id AS operationId,
    conflict_kind AS kind,field_name AS field,conflict_state AS state,local_summary AS localSummary,
    eagle_summary AS eagleSummary,created_at AS createdAt FROM connected_library_conflicts ORDER BY created_at,conflict_id`).all() as ConnectedConflictProjection[];
}
function createConflict(database: Database.Database, operation: OperationRow, kind: ConnectedConflictProjection['kind'], field: ConnectedMetadataField | null, local: string, eagle: string, now: string, createIdentity: (kind: string) => string): void {
    database.prepare(`INSERT OR IGNORE INTO connected_library_conflicts
    (conflict_id,operation_id,item_key,conflict_kind,field_name,conflict_state,local_summary,eagle_summary,created_at)
    VALUES (?,?,?,?,?,'unresolved',?,?,?)`).run(createIdentity('connected-conflict'), operation.operationId, operation.itemKey, kind, field, local, eagle, now);
    markOperation(database, operation.operationId, 'conflict', operation.attemptCount + 1, now);
    markItemSync(database, operation.itemKey, 'conflict', now);
}
function createGlobalConflict(database: Database.Database, kind: 'library-changed' | 'volume-changed', now: string, createIdentity: (kind: string) => string): void {
    for (const operation of readOperationRows(database).filter((item) => !['committed', 'failed'].includes(item.operationState))) {
        createConflict(database, operation, kind, null, 'Queued for the reviewed Eagle library', 'A different Eagle library or volume is active', now, createIdentity);
    }
}
function markTombstone(database: Database.Database, itemKey: string, operationId: string, now: string, createIdentity: (kind: string) => string): void {
    const operation = readOperation(database, operationId)!;
    database.prepare("UPDATE connected_library_items SET lifecycle_state='tombstone', original_availability='permanently-missing', sync_state='conflict',updated_at=? WHERE item_key=?").run(now, itemKey);
    createConflict(database, operation, 'delete-versus-edit', null, 'Local queued change', 'Eagle Original permanently missing', now, createIdentity);
}
function operationHasUnresolvedConflicts(database: Database.Database, operationId: string): boolean {
    return Boolean(database.prepare("SELECT 1 FROM connected_library_conflicts WHERE operation_id=? AND conflict_state IN ('unresolved','held') LIMIT 1").get(operationId));
}
function resolveOperationConflictsIfComplete(database: Database.Database, operationId: string, nextState: ConnectedOperationProjection['state'], now: string): void {
    if (!operationHasUnresolvedConflicts(database, operationId)) {
        database.prepare('UPDATE connected_library_outbox SET operation_state=?,updated_at=? WHERE operation_id=?').run(nextState, now, operationId);
        const operation = readOperation(database, operationId);
        if (operation)
            markItemSync(database, operation.itemKey, nextState === 'pending' ? 'pending' : 'clean', now);
    }
}
function resolveMetadataField(database: Database.Database, operation: OperationRow, field: ConnectedMetadataField, decision: 'use-local' | 'use-eagle', remote: EagleProviderItem, now: string): void {
    const desired = decodeJson<Record<string, unknown>>(operation.desiredJson, {});
    const base = decodeJson<Record<string, unknown>>(operation.baseJson, {});
    const remoteMetadata = providerMetadata(remote);
    base[field] = remoteMetadata[field];
    if (decision === 'use-eagle')
        delete desired[field];
    database.prepare(`
    UPDATE connected_library_outbox
    SET expected_provider_version = ?, base_json = ?, desired_json = ?, updated_at = ?
    WHERE operation_id = ?
  `).run(remote.version, JSON.stringify(base), JSON.stringify(desired), now, operation.operationId);
    resolveOperationConflictsIfComplete(database, operation.operationId, 'pending', now);
}
function computeCleanupCandidates(database: Database.Database, current: Date, retentionDays: number): ConnectedCleanupCandidateProjection[] {
    const rows = database.prepare("SELECT item_key AS itemKey,trashed_at AS trashedAt,sync_state AS syncState FROM connected_library_items WHERE lifecycle_state='trash' AND trashed_at IS NOT NULL").all() as Array<{
        itemKey: string;
        trashedAt: string;
        syncState: string;
    }>;
    const capabilities = decodeJson<{
        permanentDelete?: boolean;
    } | null>(readConnection(database).capabilitiesJson, null);
    return rows.map((row) => {
        const eligibleAt = new Date(new Date(row.trashedAt).getTime() + retentionDays * 86400000).toISOString();
        const conflict = row.syncState === 'conflict';
        const pending = row.syncState === 'pending';
        const unsupported = !capabilities?.permanentDelete;
        const blockedBy = conflict ? 'conflict' : pending ? 'pending-sync' : unsupported ? 'provider-unsupported' : 'none';
        return { itemKey: row.itemKey, eligibleAt, blockedBy, confirmable: blockedBy === 'none' && new Date(eligibleAt).getTime() <= current.getTime() };
    });
}
async function stageSelectedFile(input: {
    root: string;
    staging: string;
    filePath: string;
    item: ItemRow;
    quota: number;
    database: Database.Database;
    now: Date;
    createIdentity: (kind: string) => string;
}): Promise<{
    ref: string;
    digest: string;
    bytes: number;
}> {
    try {
        const source = path.resolve(input.filePath);
        const sourceStat = await fs.lstat(source);
        if (!sourceStat.isFile() || sourceStat.isSymbolicLink())
            throw connectedError('connected-library-staging-failed');
        const used = (input.database.prepare("SELECT COALESCE(SUM(size_bytes),0) AS bytes FROM connected_library_staging WHERE state='retained'").get() as {
            bytes: number;
        }).bytes;
        if (used + sourceStat.size > input.quota)
            throw connectedError('connected-library-staging-quota-exceeded');
        const ref = input.createIdentity('connected-staged-file');
        const relative = `${hashText(ref)}.stage`;
        const target = path.join(input.staging, relative);
        assertInside(input.root, target);
        const bytes = await fs.readFile(source);
        if (bytes.byteLength !== sourceStat.size)
            throw connectedError('connected-library-staging-failed');
        const digest = sha256(bytes);
        await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
        input.database.prepare(`INSERT INTO connected_library_staging
      (staged_ref,item_key,relative_path,content_digest,size_bytes,state,created_at)
      VALUES (?,?,?,?,?,'retained',?)`).run(ref, input.item.itemKey, relative, digest, bytes.byteLength, iso(input.now));
        return { ref, digest, bytes: bytes.byteLength };
    }
    catch (error) {
        if (error instanceof ExternalConnectedLibraryError)
            throw error;
        throw connectedError('connected-library-staging-failed');
    }
}
async function resolveStagedFile(database: Database.Database, staging: string, ref: string, digest: string): Promise<string> {
    const row = database.prepare("SELECT relative_path AS relativePath,content_digest AS contentDigest FROM connected_library_staging WHERE staged_ref=? AND state='retained'").get(ref) as {
        relativePath: string;
        contentDigest: string;
    } | undefined;
    if (!row || row.contentDigest !== digest || !/^[a-f0-9]{64}\.stage$/u.test(row.relativePath))
        throw connectedError('connected-library-staging-failed');
    const target = path.join(staging, row.relativePath);
    assertInside(staging, target);
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || sha256(await fs.readFile(target)) !== digest)
        throw connectedError('connected-library-staging-failed');
    return target;
}
async function releaseStagedFile(database: Database.Database, staging: string, ref: string, now: string): Promise<void> {
    const row = database.prepare("SELECT relative_path AS relativePath FROM connected_library_staging WHERE staged_ref=? AND state='retained'").get(ref) as {
        relativePath: string;
    } | undefined;
    if (!row)
        return;
    const target = path.join(staging, row.relativePath);
    assertInside(staging, target);
    await fs.unlink(target).catch(() => { });
    database.prepare("UPDATE connected_library_staging SET state='released',released_at=? WHERE staged_ref=?").run(now, ref);
}
async function cachePreview(directory: string, bytes: Uint8Array, quota: number): Promise<string | null> {
    if (bytes.byteLength > quota)
        return null;
    const ref = `connected-preview:${sha256(bytes)}`;
    const fileName = `${ref.slice('connected-preview:'.length)}.preview`;
    const target = path.join(directory, fileName);
    try {
        await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    }
    catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST')
            return null;
    }
    const files = await fs.readdir(directory, { withFileTypes: true });
    let total = 0;
    const entries: Array<{
        path: string;
        size: number;
        modified: number;
    }> = [];
    for (const file of files) {
        if (!file.isFile() || !/^[a-f0-9]{64}\.preview$/u.test(file.name))
            continue;
        const filePath = path.join(directory, file.name);
        const stat = await fs.lstat(filePath);
        total += stat.size;
        entries.push({ path: filePath, size: stat.size, modified: stat.mtimeMs });
    }
    for (const entry of entries.sort((left, right) => left.modified - right.modified)) {
        if (total <= quota)
            break;
        if (entry.path === target)
            continue;
        await fs.unlink(entry.path).catch(() => { });
        total -= entry.size;
    }
    return total <= quota ? ref : null;
}
async function readCachedPreview(directory: string, ref: string): Promise<Uint8Array | null> {
    if (!/^connected-preview:[a-f0-9]{64}$/u.test(ref))
        return null;
    const target = path.join(directory, `${ref.slice('connected-preview:'.length)}.preview`);
    assertInside(directory, target);
    try {
        const stat = await fs.lstat(target);
        if (!stat.isFile() || stat.isSymbolicLink())
            return null;
        return new Uint8Array(await fs.readFile(target));
    }
    catch {
        return null;
    }
}
function validateMetadataPatch(input: ConnectedMetadataPatch): ConnectedMetadataPatch {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length === 0 || Object.keys(input).some((key) => !METADATA_FIELDS.includes(key as ConnectedMetadataField)))
        throw connectedError('connected-library-request-invalid');
    const patch: ConnectedMetadataPatch = {};
    if ('name' in input) {
        if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 500)
            throw connectedError('connected-library-request-invalid');
        patch.name = input.name.trim();
    }
    if ('tags' in input)
        patch.tags = validateStringArray(input.tags, 500);
    if ('folderIds' in input)
        patch.folderIds = validateStringArray(input.folderIds, 500);
    if ('rating' in input) {
        if (!Number.isInteger(input.rating) || input.rating! < 0 || input.rating! > 5)
            throw connectedError('connected-library-request-invalid');
        patch.rating = input.rating;
    }
    if ('annotation' in input) {
        if (typeof input.annotation !== 'string' || input.annotation.length > 100000)
            throw connectedError('connected-library-request-invalid');
        patch.annotation = input.annotation;
    }
    return patch;
}
function validateStringArray(value: unknown, limit: number): string[] {
    if (!Array.isArray(value) || value.length > limit || value.some((item) => typeof item !== 'string' || !item.trim() || item.length > 500))
        throw connectedError('connected-library-request-invalid');
    return Array.from(new Set(value.map((item) => item.trim())));
}
function validateScope(scope: ConnectedLibraryScope): void {
    if (!scope || typeof scope !== 'object' || (scope.kind !== 'all' && scope.kind !== 'folders'))
        throw connectedError('connected-library-request-invalid');
    if (scope.kind === 'folders' && validateStringArray(scope.folderIds, 500).length === 0)
        throw connectedError('connected-library-request-invalid');
}
function validateConnection(connection: EagleProviderConnection): void {
    if (![connection.providerIdentity, connection.libraryIdentity, connection.volumeIdentity, connection.observedGeneration].every((value) => ID.test(value)) || !connection.displayName || connection.buildVersion < 21 || !connection.capabilities.webApiV2)
        throw connectedError('connected-library-provider-unavailable');
}
function validateProviderItem(item: EagleProviderItem): void {
    if (!ID.test(item.id) || !item.name || !Number.isSafeInteger(item.modifiedAt) || !ID.test(item.version) || item.rating < 0 || item.rating > 5 || !Number.isSafeInteger(item.size) || item.size < 0)
        throw connectedError('connected-library-provider-unavailable');
    validateStringArray(item.tags, 500);
    validateStringArray(item.folderIds, 500);
}
function providerMetadata(item: EagleProviderItem): Record<ConnectedMetadataField, unknown> {
    return { name: item.name, tags: [...item.tags], rating: item.rating, annotation: item.annotation, folderIds: [...item.folderIds] };
}
function readBaseMetadata(item: ItemRow): Record<string, unknown> { return decodeJson(item.baseMetadataJson, {}); }
function metadataContains(actual: Record<string, unknown>, expected: ConnectedMetadataPatch): boolean { return Object.entries(expected).every(([key, value]) => sameValue(actual[key], value)); }
function sameValue(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }
function summarizeValue(value: unknown): string { if (Array.isArray(value))
    return `${value.length} value(s)`; if (typeof value === 'string')
    return value.length > 80 ? `${value.slice(0, 79)}…` : value; return String(value); }
function matchesScope(folderIds: readonly string[], scope: ConnectedLibraryScope): boolean { return scope.kind === 'all' || folderIds.some((id) => scope.folderIds.includes(id)); }
function cloneScope(scope: ConnectedLibraryScope): ConnectedLibraryScope { return scope.kind === 'all' ? { kind: 'all' } : { kind: 'folders', folderIds: [...scope.folderIds] }; }
function sameProviderConnection(left: EagleProviderConnection, right: EagleProviderConnection): boolean { return left.providerIdentity === right.providerIdentity && left.libraryIdentity === right.libraryIdentity && left.volumeIdentity === right.volumeIdentity && left.observedGeneration === right.observedGeneration; }
function sameProviderIdentity(left: EagleProviderConnection, right: EagleProviderConnection): boolean { return left.providerIdentity === right.providerIdentity && left.libraryIdentity === right.libraryIdentity && left.volumeIdentity === right.volumeIdentity; }
function connectedItemKey(provider: string, library: string, item: string): string { return `connected-item:${hashText(`${provider}\0${library}\0${item}`)}`; }
function hashText(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function sha256(value: Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
function normalizeText(value: string): string { return value.normalize('NFKC').trim().toLocaleLowerCase(); }
function providerTrashTime(modifiedAt: number, fallback: string): string { const value = new Date(modifiedAt); return Number.isNaN(value.getTime()) ? fallback : value.toISOString(); }
function iso(value: Date): string { return value.toISOString(); }
function requireId(value: string): void { if (!ID.test(value))
    throw connectedError('connected-library-request-invalid'); }
function decodeJson<T>(value: string | null, fallback: T): T { try {
    return value ? JSON.parse(value) as T : fallback;
}
catch {
    return fallback;
} }
function stateFromConflicts(database: Database.Database): ConnectedLibraryProjection['state'] { return database.prepare("SELECT 1 FROM connected_library_conflicts WHERE conflict_state IN ('unresolved','held') LIMIT 1").get() ? 'conflict' : 'ready'; }
function connectedError(code: ExternalConnectedLibraryErrorCode): ExternalConnectedLibraryError { return new ExternalConnectedLibraryError(code); }
function assertInside(root: string, candidate: string): void { const relative = path.relative(root, candidate); if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw connectedError('connected-library-staging-failed'); }
async function ensureManagedDirectory(directory: string): Promise<void> { await fs.mkdir(directory, { recursive: true, mode: 0o700 }); const stat = await fs.lstat(directory); if (!stat.isDirectory() || stat.isSymbolicLink())
    throw connectedError('connected-library-staging-failed'); }
function recordEvent(database: Database.Database, event: string, item: string | null, operation: string | null, now: string): void { database.prepare('INSERT INTO connected_library_events (event_kind,item_key,operation_id,created_at) VALUES (?,?,?,?)').run(event, item, operation, now); }
function writeReceipt(database: Database.Database, receipt: string, kind: string, result: unknown, now: string): void { database.prepare('INSERT OR REPLACE INTO connected_library_receipts (receipt,receipt_kind,result_json,created_at) VALUES (?,?,?,?)').run(receipt, kind, JSON.stringify(result), now); }
function readReceipt<T>(database: Database.Database, receipt: string, kind: string): T | null { const row = database.prepare('SELECT result_json AS resultJson FROM connected_library_receipts WHERE receipt=? AND receipt_kind=?').get(receipt, kind) as {
    resultJson: string;
} | undefined; return row ? decodeJson<T | null>(row.resultJson, null) : null; }
const CONNECTED_ERROR_MESSAGES: Record<ExternalConnectedLibraryErrorCode, string> = {
    'connected-library-not-ready': 'The Connected Library is not ready.',
    'connected-library-read-only': 'The Connected Library has no reviewed write grant.',
    'connected-library-review-stale': 'The Connected Library review is stale.',
    'connected-library-provider-unavailable': 'The Eagle provider is unavailable.',
    'connected-library-identity-changed': 'The Eagle library or volume identity changed.',
    'connected-library-generation-stale': 'The Connected Library generation changed.',
    'connected-library-item-unavailable': 'The connected item is unavailable.',
    'connected-library-item-out-of-scope': 'The connected item is outside the reviewed sync scope.',
    'connected-library-request-invalid': 'The Connected Library request is invalid.',
    'connected-library-staging-quota-exceeded': 'The edit staging quota is full; pending edits were retained.',
    'connected-library-staging-failed': 'The edit staging operation failed; existing pending edits were retained.',
    'connected-library-operation-unsupported': 'The negotiated Eagle provider does not support this operation.',
    'connected-library-conflict-unavailable': 'The Connected Library conflict is unavailable.'
};
