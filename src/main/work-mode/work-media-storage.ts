import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import sharp from 'sharp';
import type { WorkMediaScope, WorkMediaSnapshot, WorkMediaWrite, WorkMediaFile, ReferenceFrame } from '../../shared/contracts/work-media.contract';
import { validateWorkMediaScope, validateWorkMediaWrite } from '../../shared/contracts/work-media.contract';
import { readWorkSets } from '../library-lifecycle/work-sets';
import { readManagedOriginal } from '../library-lifecycle/managed-original-read';
import { readVerifiedOwnedFile } from '../platform/verified-owned-file';
import { assertExistingDirectoryInsideManagedRoot } from '../platform/filesystem-guard';
import { MAX_VIDEO_BYTES, type WorkVideoRuntime } from './windows-video-runtime';
import { ActiveLibraryHostError } from '../../shared/contracts/active-library.contract';
type Binding = {
    root: string;
    managed: string;
    staging: string;
    previews: string;
    database: Database.Database;
    identity: string;
    generation: string;
    notebookSession: string;
};
type Source = {
    revision: string;
    preview: string;
    sourceGeneration: string;
    format: string;
};
const fail = (message: string): never => { throw new ActiveLibraryHostError('library-operation-failed', message); };
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function context(active: Binding, input: WorkMediaScope) {
    const scope = validateWorkMediaScope(input), catalog = readWorkSets(active, scope, 'device:media-read'), set = catalog.sets.find(set => set.id === scope.setId);
    if (!set || !set.assetIds.includes(scope.assetId) || set.unavailableIds.includes(scope.assetId))
        return fail('参考已移除或素材不可用，请重新打开工作集。');
    const source = active.database.prepare(`SELECT l.revision,c.grid_thumbnail_ref AS preview,r.source_generation AS sourceGeneration,r.source_format AS format
    FROM asset_lifecycle l JOIN promotion_links p ON p.design_asset_identity=l.design_asset_identity
    JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity
    WHERE l.design_asset_identity=? AND l.lifecycle_state='active' AND l.ownership='managed'`).get(scope.assetId) as Source | undefined;
    if (!source)
        return fail('此来源目前不支持受管视频或原件交付；请使用已允许的来源预览。');
    return { scope, set, source };
}
export function readWorkMedia(active: Binding, input: WorkMediaScope): WorkMediaSnapshot {
    const { scope, set, source } = context(active, input), db = active.database, schemaVersion = Number(db.pragma('user_version', { simple: true }));
    const state = schemaVersion >= 15 ? db.prepare('SELECT * FROM work_media_state WHERE set_id=? AND asset_id=?').get(scope.setId, scope.assetId) as Record<string, unknown> | undefined : undefined;
    if (state && state.source_generation !== source.sourceGeneration)
        return fail('视频内容版本已变化，已保存帧保留，请先核对来源。');
    const frames = schemaVersion >= 15 ? db.prepare(`SELECT id,asset_id AS assetId,source_generation AS sourceGeneration,requested_ticks AS requestedTicks,
    actual_ticks AS actualTicks,time_base AS timeBase,position,note,png_sha256 AS pngSha256,created_at AS createdAt,method,transform
    FROM work_reference_frames WHERE set_id=? AND asset_id=? AND active=1 ORDER BY position,id`).all(scope.setId, scope.assetId) as ReferenceFrame[] : [];
    return { schemaVersion, sessionToken: active.notebookSession, setRevision: set.revision, revision: Number(state?.revision ?? 0), assetId: scope.assetId, sourceGeneration: source.sourceGeneration,
        sourceUrl: String(state?.source_url ?? ''), positionTicks: Number(state?.position_ticks ?? 0), selectedFrameId: state?.selected_frame_id ? String(state.selected_frame_id) : null,
        durationTicks: state?.duration_ticks ? Number(state.duration_ticks) : null, frames };
}
function assertWrite(active: Binding, input: WorkMediaWrite) {
    const current = readWorkMedia(active, { libraryIdentity: input.libraryIdentity, generation: input.generation, setId: input.setId, assetId: input.assetId });
    if (current.schemaVersion < 15)
        return fail('请先明确启用视频参考存储（v15）。');
    if (current.sessionToken !== input.sessionToken || current.revision !== input.expectedRevision)
        return fail('视频参考已变化，当前输入保留，请核对已保存内容后重试。');
    return current;
}
const ensureState = (db: Database.Database, input: WorkMediaScope, sourceGeneration: string) => db.prepare(`INSERT OR IGNORE INTO work_media_state VALUES(?,?,1,?,'',0,NULL,NULL)`).run(input.setId, input.assetId, sourceGeneration);
export async function writeWorkMedia(active: Binding, input: WorkMediaWrite, runtime: WorkVideoRuntime | undefined, signal?: AbortSignal): Promise<WorkMediaSnapshot> {
    const request = validateWorkMediaWrite(input), scope = { libraryIdentity: request.libraryIdentity, generation: request.generation, setId: request.setId, assetId: request.assetId }, c = request.command, db = active.database;
    if (c.kind === 'enable')
        return fail('视频存储升级请使用正式确认入口。');
    // Exact request replay returns durable state even after a later remove, and
    // never decodes again or silently restores a removed reference.
    if (c.kind === 'capture' && Number(db.pragma('user_version', { simple: true })) >= 15) {
        const old = db.prepare('SELECT requested_ticks,source_generation FROM work_reference_frames WHERE set_id=? AND asset_id=? AND request_id=?').get(scope.setId, scope.assetId, c.requestId) as {
            requested_ticks: number;
            source_generation: string;
        } | undefined;
        if (old) {
            const current = readWorkMedia(active, scope);
            if (request.sessionToken !== active.notebookSession || old.requested_ticks !== c.requestedTicks || old.source_generation !== current.sourceGeneration)
                return fail('选帧请求身份冲突，请核对既有结果。');
            return current;
        }
    }
    const current = assertWrite(active, request), before = context(active, scope);
    if (before.source.format !== 'mp4')
        return fail('请先选择已收录的 MP4 视频。');
    if (signal?.aborted)
        return fail('视频操作已取消。');
    if (c.kind === 'save' || c.kind === 'remove')
        return db.transaction(() => {
            const baseline = assertWrite(active, request);
            ensureState(db, scope, baseline.sourceGeneration);
            if (c.kind === 'remove') {
                if (!baseline.frames.some(f => f.id === c.frameId))
                    return fail('参考帧已移除，请重新读取。');
                db.prepare('UPDATE work_reference_frames SET active=0 WHERE id=? AND set_id=? AND asset_id=?').run(c.frameId, scope.setId, scope.assetId);
                baseline.frames.filter(f => f.id !== c.frameId).forEach((f, index) => db.prepare('UPDATE work_reference_frames SET position=? WHERE id=?').run(index, f.id));
                db.prepare('UPDATE work_media_state SET selected_frame_id=CASE WHEN selected_frame_id=? THEN NULL ELSE selected_frame_id END WHERE set_id=? AND asset_id=?').run(c.frameId, scope.setId, scope.assetId);
            }
            else {
                if (c.frames.length !== baseline.frames.length || c.frames.some(f => !baseline.frames.some(old => old.id === f.id)) || c.selectedFrameId !== null && !c.frames.some(f => f.id === c.selectedFrameId))
                    return fail('帧列表已变化，请保留当前备注并核对。');
                if (baseline.durationTicks !== null && c.positionTicks >= baseline.durationTicks)
                    return fail('播放位置超过视频时长。');
                c.frames.forEach((frame, index) => db.prepare('UPDATE work_reference_frames SET position=?,note=? WHERE id=? AND set_id=? AND asset_id=? AND active=1').run(index, frame.note, frame.id, scope.setId, scope.assetId));
                db.prepare('UPDATE work_media_state SET source_url=?,position_ticks=?,selected_frame_id=? WHERE set_id=? AND asset_id=?').run(c.sourceUrl, c.positionTicks, c.selectedFrameId, scope.setId, scope.assetId);
            }
            if (baseline.revision > 0)
                db.prepare('UPDATE work_media_state SET revision=revision+1 WHERE set_id=? AND asset_id=?').run(scope.setId, scope.assetId);
            return readWorkMedia(active, scope);
        })();
    if (!runtime)
        return fail('视频运行文件未就绪，请检查安装。');
    if (current.frames.length >= 100)
        return fail('每份视频最多100张参考帧。');
    await assertExistingDirectoryInsideManagedRoot(active.root, active.staging);
    await assertExistingDirectoryInsideManagedRoot(active.root, active.previews);
    const original = await readManagedOriginal(active, scope.assetId, before.source.revision, before.source.preview, MAX_VIDEO_BYTES);
    const temporary = path.join(active.staging, 'video-source-' + randomUUID() + '.mp4'), id = 'reference-frame:' + randomUUID(), pngRef = id.replace(/:/g, '-') + '.png', output = path.join(active.previews, pngRef);
    await fs.writeFile(temporary, original.bytes, { flag: 'wx' });
    let committed = false, created = false;
    try {
        const decoded = await runtime.frame(temporary, c.requestedTicks, active.staging, signal);
        const png = await sharp(decoded.png, { limitInputPixels: 3840 * 2160 }).png().toBuffer();
        if (signal?.aborted)
            return fail('视频操作已取消。');
        if (JSON.stringify(context(active, scope).source) !== JSON.stringify(before.source))
            return fail('视频在解码期间已变化，未保存参考帧。');
        await fs.writeFile(output, png, { flag: 'wx' });
        created = true;
        const sync = await fs.open(output, 'r+');
        try {
            await sync.sync();
        }
        finally {
            await sync.close();
        }
        const result = db.transaction(() => {
            const baseline = assertWrite(active, request);
            if (signal?.aborted)
                return fail('视频操作已取消。');
            ensureState(db, scope, baseline.sourceGeneration);
            db.prepare('INSERT INTO work_reference_frames VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)').run(id, scope.setId, scope.assetId, c.requestId, baseline.sourceGeneration, c.requestedTicks, decoded.metadata.actualTicks, 10000000, baseline.frames.length, '', pngRef, png.length, sha(png), new Date().toISOString(), runtime.identity, 'media-foundation-visible-aperture/8bit-rgb/png/full-resolution/v1');
            db.prepare('UPDATE work_media_state SET revision=?,duration_ticks=?,position_ticks=?,selected_frame_id=? WHERE set_id=? AND asset_id=?').run(baseline.revision + 1, decoded.metadata.durationTicks, decoded.metadata.actualTicks, id, scope.setId, scope.assetId);
            return readWorkMedia(active, scope);
        })();
        committed = true;
        return result;
    }
    finally {
        await fs.unlink(temporary);
        if (created && !committed)
            await fs.unlink(output);
    }
}
export async function readWorkMediaFile(active: Binding, input: WorkMediaFile): Promise<{
    bytes: Uint8Array;
    type: string;
    fileName: string;
    sourceGeneration: string;
}> {
    const { frameId, ...value } = input, scope = validateWorkMediaScope(value), before = context(active, scope);
    if (frameId) {
        const data = readWorkMedia(active, scope);
        if (!data.frames.some(f => f.id === frameId))
            return fail('参考帧不在当前工作集范围内。');
        const row = active.database.prepare('SELECT png_ref,png_bytes,png_sha256 FROM work_reference_frames WHERE id=? AND set_id=? AND asset_id=? AND active=1').get(frameId, scope.setId, scope.assetId) as {
            png_ref: string;
            png_bytes: number;
            png_sha256: string;
        };
        const checked = await readVerifiedOwnedFile({ root: active.root, role: active.previews, relative: row.png_ref, expectedSize: row.png_bytes, expectedDigest: row.png_sha256, maximumBytes: 32 * 1024 * 1024 });
        if (!readWorkMedia(active, scope).frames.some(f => f.id === frameId))
            return fail('参考帧已移除。');
        return { bytes: checked.bytes, type: 'image/png', fileName: row.png_ref, sourceGeneration: before.source.sourceGeneration };
    }
    const original = await readManagedOriginal(active, scope.assetId, before.source.revision, before.source.preview, MAX_VIDEO_BYTES);
    if (JSON.stringify(context(active, scope).source) !== JSON.stringify(before.source))
        return fail('原件已变化，请重新读取。');
    return { bytes: original.bytes, type: before.source.format === 'mp4' ? 'video/mp4' : before.source.format === 'jpeg' ? 'image/jpeg' : 'image/' + before.source.format, fileName: 'original.' + (before.source.format === 'jpeg' ? 'jpg' : before.source.format), sourceGeneration: before.source.sourceGeneration };
}
