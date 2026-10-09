import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { ActiveLibraryHost } from '../../shared/contracts/active-library.contract';
import type { WorkHandoffReceipt, WorkHandoffRequest, WorkHandoffImageResult, WorkImageTransform, WorkMediaScope } from '../../shared/contracts/work-media.contract';
import { validateWorkHandoff } from '../../shared/contracts/work-media.contract';
import type { VisualAdmission } from '../visual-ai/visual-admission';
import { readVerifiedOwnedFile } from '../platform/verified-owned-file';
import { createBoundedWorkZip, workZipEntryNames, WORK_ZIP_MAX_BYTES, workHandoffCancelled } from './bounded-work-zip';
import { workRecord, workId } from '../../shared/contracts/work-set.contract';
interface SourceMember { assetId: string; sourceGeneration: string; digest: string }
const receiptLimit = (kind: WorkHandoffRequest['kind']) => kind === 'zip' ? 128 * 1024 : 16384;
const assertNotCancelled = (signal: AbortSignal) => { if (signal.aborted) throw workHandoffCancelled(); };
async function persistPreparedCopy(directory: string, fileName: string, bytes: Uint8Array, json: string, signal: AbortSignal) {
    assertNotCancelled(signal);
    await fs.mkdir(directory);
    const directoryIdentity = await fs.lstat(directory), owned: Array<{ file: string; dev: number; ino: number }> = [];
    try {
        assertNotCancelled(signal);
        for (const [name, value] of [[fileName, bytes], ['receipt.json', json]] as const) {
            const file = path.join(directory, name), handle = await fs.open(file, 'wx');
            try {
                const identity = await handle.stat(); owned.push({ file, dev: identity.dev, ino: identity.ino });
                assertNotCancelled(signal); await handle.writeFile(value); assertNotCancelled(signal); await handle.sync();
            } finally { await handle.close(); }
        }
    } catch (error) {
        // Undo only this call's exclusive-created files with matching physical
        // identities. Unknown replacements are retained for review, never retried
        // or delivered to the OS. No previous handoff or Original is touched.
        let removed = false;
        try {
            const current = await fs.lstat(directory), children = await fs.readdir(directory);
            if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== directoryIdentity.dev || current.ino !== directoryIdentity.ino || children.some(name => !owned.some(item => path.basename(item.file) === name))) throw Error('UNKNOWN_COPY_OWNERSHIP');
            for (const item of owned) { const actual = await fs.lstat(item.file); if (!actual.isFile() || actual.isSymbolicLink() || actual.dev !== item.dev || actual.ino !== item.ino) throw Error('UNKNOWN_COPY_OWNERSHIP'); }
            for (const item of owned) await fs.unlink(item.file);
            await fs.rmdir(directory); removed = true;
        } catch { /* Preserve unknown partial material for explicit review. */ }
        const message = removed ? '交付副本保存未完成，未请求接收应用；已回收本次不完整副本，原件保持。' : '交付副本保存未完成，未请求接收应用；本次不完整副本的归属未确认，已保留待检查，请勿盲目重试。';
        if (signal.aborted) throw workHandoffCancelled(message);
        throw Object.assign(Error(message), { code: 'WORK_HANDOFF_WRITE_FAILED', cause: error });
    }
}
interface HeldHandoff {
    receipt: WorkHandoffReceipt;
    scope: WorkHandoffRequest;
    actor: string;
    sourceGeneration: string;
    sourceMembers?: SourceMember[];
    provenance?: {
        sourceUrl: string;
        transform: string;
        sourceSha256?: string;
        image?: { request: WorkImageTransform; result: WorkHandoffImageResult; operations: string[] };
        archive?: { method: string; inputs: SourceMember[] };
        frame?: {
            actualTicks: number;
            requestedTicks: number;
            timeBase: number;
            method: string;
        };
    };
}
/** Copies are independent deliverables. They survive library/application close;
 * only explicit user cleanup (after the receiver is done) sends them to Trash. */
export function createWorkFileHandoffs(input: {
    host: ActiveLibraryHost;
    root: string;
    admission?: VisualAdmission;
    open: (file: string) => Promise<string>;
    trash: (file: string) => Promise<void>;
}) {
    const records = new Map<string, HeldHandoff>(), sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
    type Job = { abort: AbortController; done: Promise<void>; finish: () => void };
    const jobs = new Map<string, Set<Job>>();
    let queue: Promise<unknown> = Promise.resolve();
    const serialize = <T>(fn: () => Promise<T>) => { const next = queue.then(fn); queue = next.catch(() => { }); return next; };
    const retainedDirectories = async () => {
        const rootInfo = await fs.lstat(input.root);
        if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw Error('交付目录无效。');
        const entries = await fs.readdir(input.root, { withFileTypes: true });
        const directories: import('node:fs').Dirent[] = [];
        let metadataBytes = 0;
        for (const entry of entries) {
            if (entry.name === '.DS_Store') {
                // Finder metadata is neither a receipt nor an import source.
                // Never read it, follow a link, or ignore arbitrary root files.
                const info = await fs.lstat(path.join(input.root, entry.name));
                if (!info.isFile() || info.isSymbolicLink() || info.size > 1024 * 1024) throw Error('交付目录的系统元数据无效，请检查。');
                metadataBytes += info.size;
            } else {
                if (!entry.isDirectory() || entry.isSymbolicLink() || !/^[a-f0-9-]{36}$/.test(entry.name)) throw Error('交付目录包含未知内容，请检查。');
                directories.push(entry);
            }
        }
        return { directories, metadataBytes };
    };
    const readReceipt = async (id: string) => {
        if (!/^handoff:[a-f0-9-]{36}$/.test(id)) throw Error('交付记录无效。');
        const relative = id.slice(8) + '/receipt.json', file = path.join(input.root, relative), before = await fs.lstat(file, { bigint: true });
        if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size < 1n || before.size > BigInt(128 * 1024)) throw Error('交付记录无效。');
        const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        let bytes: Uint8Array;
        try {
            const opened = await handle.stat({ bigint: true });
            if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size || !opened.isFile()) throw Error('交付记录已变化。');
            const buffer = Buffer.alloc(Number(before.size) + 1), received = await handle.read(buffer, 0, buffer.length, 0);
            if (received.bytesRead !== Number(before.size)) throw Error('交付记录已变化。');
            bytes = buffer.subarray(0, received.bytesRead);
        } finally { await handle.close(); }
        return readVerifiedOwnedFile({ root: input.root, role: input.root, relative, expectedSize: bytes.length, expectedDigest: sha(bytes), maximumBytes: 128 * 1024 });
    };
    const immutableRecord = (record: HeldHandoff) => JSON.stringify({ scope: record.scope, actor: record.actor, sourceGeneration: record.sourceGeneration, sourceMembers: record.sourceMembers, provenance: record.provenance, receipt: { id: record.receipt.id, kind: record.receipt.kind, fileName: record.receipt.fileName, bytes: record.receipt.bytes, sha256: record.receipt.sha256, image: record.receipt.image, archive: record.receipt.archive } });
    const load = async (id: string, fresh = false) => {
        if (!/^handoff:[a-f0-9-]{36}$/.test(id))
            throw Error('交付记录无效。');
        const cached = records.get(id);
        let record = fresh ? undefined : cached;
        if (!record) {
            const dir = path.join(input.root, id.slice(8)), info = await fs.lstat(dir);
            if (!info.isDirectory() || info.isSymbolicLink())
                throw Error('交付目录已变化。');
            const { bytes } = await readReceipt(id);
            if (bytes.length > 128 * 1024)
                throw Error('交付记录无效。');
            record = JSON.parse(Buffer.from(bytes).toString()) as HeldHandoff;
            const storedScope = validateWorkHandoff(record.scope);
            if (bytes.length > receiptLimit(storedScope.kind) || record.receipt.id !== id || record.receipt.kind !== storedScope.kind)
                throw Error('交付记录无效。');
            if (storedScope.kind !== 'zip' && (record.sourceMembers !== undefined || record.receipt.archive !== undefined)) throw Error('交付记录无效。');
            if (fresh && cached && immutableRecord(record) !== immutableRecord(cached)) throw Error('交付记录身份已变化，请核对副本，未请求接收应用。');
            records.set(id, record);
        }
        const current = input.host.inspect();
        if (current.state !== 'ready' || current.identity !== record.scope.libraryIdentity || !current.generation)
            throw Error('请先授权打开交付副本所属的素材库。');
        const restoredScope = { libraryIdentity: record.scope.libraryIdentity, generation: current.generation, setId: record.scope.setId, assetId: record.scope.assetId };
        if (record.scope.kind === 'zip') {
            const request = validateWorkHandoff(record.scope), ids = request.assetIds!, members = record.sourceMembers, archive = record.receipt.archive;
            if (!Array.isArray(members) || members.length !== ids.length || !archive || archive.count !== ids.length || !Array.isArray(archive.items) || archive.items.length !== ids.length) throw Error('ZIP交付成员记录无效。');
            workRecord(archive, ['count', 'items']);
            if (record.receipt.image !== undefined || !record.receipt.fileName.endsWith('.zip')) throw Error('ZIP交付记录类型无效。');
            const names = workZipEntryNames(archive.items.map(item => item.fileName));
            let total = 0;
            for (const [index, member] of members.entries()) {
                const stored = workRecord(member, ['assetId', 'sourceGeneration', 'digest']), item = workRecord(archive.items[index], ['fileName', 'bytes', 'sha256']);
                if (workId(stored.assetId) !== ids[index] || typeof stored.digest !== 'string' || !/^[a-f0-9]{64}$/.test(stored.digest) || stored.sourceGeneration !== 'sha256:' + stored.digest || item.sha256 !== stored.digest || item.fileName !== names[index] || !Number.isSafeInteger(item.bytes) || Number(item.bytes) < 0) throw Error('ZIP交付成员记录无效。');
                total += Number(item.bytes); if (total > WORK_ZIP_MAX_BYTES) throw Error('ZIP交付成员预算无效。');
                const memberScope = { ...restoredScope, assetId: ids[index] }, currentMember = await input.host.readWorkMedia(memberScope), original = await input.host.readWorkMediaFile(memberScope);
                if (currentMember.sourceGeneration !== stored.sourceGeneration || original.sourceGeneration !== stored.sourceGeneration || original.bytes.length !== item.bytes || sha(original.bytes) !== stored.digest) throw Error('ZIP成员来源已变化，请重新准备交付。');
            }
        } else if (record.sourceMembers !== undefined || record.receipt.archive !== undefined) throw Error('交付记录无效。');
        const info = await input.host.readWorkMedia(restoredScope);
        if (info.sourceGeneration !== record.sourceGeneration)
            throw Error('素材来源已变化，请重新准备交付。');
        return record;
    };
    const read = async (id: string) => {
        const record = await load(id), relative = id.slice(8) + '/' + record.receipt.fileName;
        const file = await readVerifiedOwnedFile({ root: input.root, role: input.root, relative, expectedSize: record.receipt.bytes, expectedDigest: record.receipt.sha256, maximumBytes: 96 * 1024 * 1024 });
        if (record.scope.kind === 'zip' && (file.bytes[0] !== 0x50 || file.bytes[1] !== 0x4b || file.bytes[2] !== 0x03 || file.bytes[3] !== 0x04)) throw Error('ZIP副本格式无效，未交付。');
        await load(id);
        return { record, bytes: file.bytes, path: path.join(input.root, relative) };
    };
    const prepare = (actor: string, value: WorkHandoffRequest): Promise<WorkHandoffReceipt> => {
        const abort = new AbortController(); let finish!: () => void;
        const job: Job = { abort, done: new Promise<void>(resolve => { finish = resolve; }), finish: () => finish() };
        const owned = jobs.get(actor) ?? new Set<Job>(); owned.add(job); jobs.set(actor, owned);
        return serialize(async () => {
        const signal = abort.signal, check = () => assertNotCancelled(signal), wait = async <T>(fn: () => Promise<T>) => { check(); const answer = await fn(); check(); return answer; };
        let permit: Awaited<ReturnType<VisualAdmission['reserveLocalWork']>> | undefined, committed: WorkHandoffReceipt | undefined, openDispatched = false;
        try {
        check();
        const request = validateWorkHandoff(value), scope = { libraryIdentity: request.libraryIdentity, generation: request.generation, setId: request.setId, assetId: request.assetId };
        permit = await input.admission?.reserveLocalWork('media', 512 * 1024 * 1024, signal); check();
            const before = await wait(() => input.host.readWorkMedia(scope)), asset = (await wait(() => input.host.readAssetContext([scope.assetId]))).assets[0];
            if (!asset)
                throw Error('素材不可用。');
            const selectedFrame = request.frameId ? before.frames.find(frame => frame.id === request.frameId) : undefined;
            if (request.frameId && !selectedFrame)
                throw Error('所选参考帧已变化，请重新选择。');
            let bytes: Uint8Array, extension: string, image: WorkHandoffImageResult | undefined, sourceSha256: string | undefined, imageOperations: string[] | undefined, archive: WorkHandoffReceipt['archive'], sourceMembers: SourceMember[] | undefined;
            if (request.kind === 'zip') {
                const plans: Array<{ scope: typeof scope; sourceGeneration: string; fileName: string; size: number }> = [];
                let plannedBytes = 0;
                for (const assetId of request.assetIds!) {
                    const memberScope = { ...scope, assetId }, member = await wait(() => input.host.readWorkMedia(memberScope)), projection = (await wait(() => input.host.readAssetContext([assetId]))).assets[0];
                    if (!projection || !Number.isSafeInteger(projection.fileSize) || Number(projection.fileSize) < 0) throw Error('ZIP成员字节大小未明确，未读取或交付。');
                    plannedBytes += Number(projection.fileSize);
                    if (plannedBytes > WORK_ZIP_MAX_BYTES) throw Error('ZIP总输入超过96 MiB，未读取或交付。');
                    plans.push({ scope: memberScope, sourceGeneration: member.sourceGeneration, fileName: projection.fileName, size: Number(projection.fileSize) });
                }
                const originals: Array<{ name: string; bytes: Uint8Array }> = [], names = workZipEntryNames(plans.map(plan => plan.fileName));
                sourceMembers = []; const items: NonNullable<WorkHandoffReceipt['archive']>['items'] = [];
                let actualBytes = 0;
                for (const [index, plan] of plans.entries()) {
                    const original = await wait(() => input.host.readWorkMediaFile(plan.scope)), digest = sha(original.bytes);
                    actualBytes += original.bytes.length;
                    if (actualBytes > WORK_ZIP_MAX_BYTES || original.bytes.length !== plan.size) throw Error('ZIP成员大小已变化或总输入超过96 MiB，未交付。');
                    if (original.sourceGeneration !== plan.sourceGeneration || original.sourceGeneration !== 'sha256:' + digest) throw Error('ZIP成员来源已变化，未交付旧版本。');
                    originals.push({ name: plan.fileName, bytes: original.bytes });
                    sourceMembers.push({ assetId: plan.scope.assetId, sourceGeneration: original.sourceGeneration, digest });
                    items.push({ fileName: names[index], bytes: original.bytes.length, sha256: digest });
                }
                bytes = await createBoundedWorkZip(originals, WORK_ZIP_MAX_BYTES, signal); check(); extension = 'zip'; archive = { count: items.length, items };
                for (const [index, plan] of plans.entries()) {
                    const now = await wait(() => input.host.readWorkMedia(plan.scope)), original = await wait(() => input.host.readWorkMediaFile(plan.scope));
                    if (now.sourceGeneration !== sourceMembers[index].sourceGeneration || original.sourceGeneration !== sourceMembers[index].sourceGeneration || sha(original.bytes) !== sourceMembers[index].digest) throw Error('ZIP成员来源在归档期间已变化，未交付旧版本。');
                }
            }
            else if (request.kind === 'reference-frame') {
                const frame = await wait(() => input.host.readWorkMediaFile({ ...scope, frameId: request.frameId }));
                bytes = frame.bytes;
                extension = 'png';
            }
            else if (request.kind === 'preview') {
                bytes = await wait(() => input.host.readPreview(scope.assetId));
                extension = bytes[0] === 137 ? 'png' : bytes[0] === 255 ? 'jpg' : 'webp';
            }
            else {
                const original = await wait(() => input.host.readWorkMediaFile(scope));
                if (original.sourceGeneration !== before.sourceGeneration) throw Error('素材已变化，未交付旧版本。');
                if (request.kind === 'processed-image') {
                    if (original.type === 'video/mp4') throw Error('视频不支持整段图像处理，请选取参考帧后使用独立图像。');
                    const transform = request.imageTransform!;
                    sourceSha256 = sha(original.bytes);
                    const metadata = await wait(() => sharp(original.bytes, { limitInputPixels: 16_000_000 }).metadata());
                    if (!metadata.width || !metadata.height || metadata.width * metadata.height > 16_000_000 || (metadata.pages ?? 1) > 1)
                        throw Error('图像处理仅支持单帧、最多16百万像素的来源。');
                    let pipeline = sharp(original.bytes, { limitInputPixels: 16_000_000 }).rotate();
                    imageOperations = ['auto-orient'];
                    if (transform.resize) {
                        pipeline = pipeline.resize(transform.resize.width, transform.resize.height, { fit: 'inside', withoutEnlargement: true });
                        imageOperations.push('resize-inside/without-enlargement');
                    }
                    if (transform.format === 'jpeg') {
                        pipeline = pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: transform.quality });
                        imageOperations.push('flatten-alpha/white', 'jpeg/quality-' + transform.quality);
                    } else if (transform.format === 'webp') {
                        pipeline = pipeline.webp({ quality: transform.quality });
                        imageOperations.push('webp/quality-' + transform.quality);
                    } else {
                        pipeline = pipeline.png();
                        imageOperations.push('png/lossless-quality-not-applied');
                    }
                    if (!transform.stripMetadata) pipeline = pipeline.withMetadata();
                    imageOperations.push(transform.stripMetadata ? 'strip-metadata' : 'withMetadata/partial');
                    bytes = await wait(() => pipeline.toBuffer());
                    const actual = await wait(() => sharp(bytes, { limitInputPixels: 16_000_000 }).metadata());
                    const retainedMetadata: WorkHandoffImageResult['retainedMetadata'] = [];
                    for (const key of ['exif', 'icc', 'iptc', 'xmp'] as const) if (actual[key]?.length) retainedMetadata.push(key);
                    image = { width: actual.width!, height: actual.height!, format: transform.format, hasAlpha: Boolean(actual.hasAlpha), autoOriented: true, qualityApplied: transform.format !== 'png', jpegAlphaFlattened: transform.format === 'jpeg' && Boolean(metadata.hasAlpha), metadataPolicy: transform.stripMetadata ? 'stripped' : 'partial', retainedMetadata };
                    extension = transform.format === 'jpeg' ? 'jpg' : transform.format;
                }
                else if (request.kind === 'compatible-png') {
                    if (original.type === 'video/mp4')
                        throw Error('视频请交付原视频或选定参考帧；PNG 不能替代整段视频。');
                    bytes = await wait(() => sharp(original.bytes, { limitInputPixels: 16 * 1024 * 1024 }).rotate().png().toBuffer());
                    extension = 'png';
                }
                else {
                    bytes = original.bytes;
                    extension = path.extname(original.fileName).slice(1);
                }
            }
            if (bytes.length > 96 * 1024 * 1024)
                throw Error('交付文件超过96 MiB，请使用外部应用显式导出。');
            const after = await wait(() => input.host.readWorkMedia(scope));
            if (after.sourceGeneration !== before.sourceGeneration)
                throw Error('素材已变化，未交付旧版本。');
            await wait(() => fs.mkdir(input.root, { recursive: true }));
            const rootInfo = await wait(() => fs.lstat(input.root));
            if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink())
                throw Error('交付目录无效。');
            const { directories, metadataBytes } = await wait(() => retainedDirectories());
            let retainedBytes = metadataBytes;
            for (const dir of directories) {
                if (!dir.isDirectory() || dir.isSymbolicLink() || !/^handoff-[a-f0-9-]{36}$/.test('handoff-' + dir.name))
                    throw Error('交付目录包含未知内容，请检查。');
                for (const file of await wait(() => fs.readdir(path.join(input.root, dir.name), { withFileTypes: true }))) {
                    if (!file.isFile() || file.isSymbolicLink())
                        throw Error('交付目录包含未知内容，请检查。');
                    retainedBytes += (await wait(() => fs.stat(path.join(input.root, dir.name, file.name)))).size;
                }
            }
            // Existing receipts may be up to 16 KiB (ZIP: 128 KiB) and an open request updates
            // that receipt after delivery. Reserve the same bounded metadata
            // allowance before writing any copy, so receipt bytes cannot put the
            // retained directory over its 1 GiB cap.
            if (directories.length >= 64 || retainedBytes + bytes.length + receiptLimit(request.kind) > 1024 * 1024 * 1024)
                throw Error('交付副本达到保留上限（64份或1 GiB），请在接收应用读完后清理。');
            const id = 'handoff:' + randomUUID(), directory = path.join(input.root, id.slice(8));
            const stem = path.basename(asset.fileName, path.extname(asset.fileName)).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 100) || '素材';
            const fileName = stem + ' ' + (request.kind === 'original' ? '原件副本' : request.kind === 'preview' ? '预览副本' : request.kind === 'reference-frame' ? '参考帧 ' + (selectedFrame!.actualTicks / 1e7).toFixed(7) + 's' : request.kind === 'processed-image' ? '图像处理副本' : request.kind === 'zip' ? 'ZIP归档' : '兼容导出') + '.' + extension;
            const file = path.join(directory, fileName);
            const details = image ? `图像处理生成${image.width}×${image.height} ${image.format.toUpperCase()}独立副本。${image.format === 'png' ? 'PNG无损，质量设置不适用。' : ''}${image.jpegAlphaFlattened ? 'JPEG不支持透明，已铺白底。' : ''}${image.metadataPolicy === 'stripped' ? '已移除元数据。' : '仅部分保留元数据；输出含' + (image.retainedMetadata.join('、') || '无支持的元数据块') + '，不保证完整保留。'}` : archive ? `ZIP已按所选顺序归档${archive.count}份原件的独立副本，未加密；库中原件保持。` : '';
            const receipt: WorkHandoffReceipt = { id, fileName, bytes: bytes.length, sha256: sha(bytes), kind: request.kind, status: 'prepared', message: details + '交付副本已准备；不会自动清理，请在接收应用读完后明确清理。', ...(image ? { image } : {}), ...(archive ? { archive } : {}) };
            const held: HeldHandoff = { receipt, scope: request, actor, sourceGeneration: before.sourceGeneration, ...(sourceMembers ? { sourceMembers } : {}), provenance: { sourceUrl: before.sourceUrl, transform: request.kind === 'zip' ? 'archiver/7.0.1/zip/deflate-6/utf8/v1' : request.kind === 'processed-image' ? 'sharp-processed-image/v1' : request.kind === 'compatible-png' ? 'sharp-auto-orient/full-resolution/png' : request.kind === 'preview' ? 'required-preview' : selectedFrame?.transform ?? 'byte-identical-original-copy', ...(archive ? { archive: { method: 'archiver/7.0.1/zip/deflate-6/utf8/v1', inputs: sourceMembers! } } : {}), ...(image ? { sourceSha256, image: { request: request.imageTransform!, result: image, operations: imageOperations! } } : {}), ...(selectedFrame ? { frame: { actualTicks: selectedFrame.actualTicks, requestedTicks: selectedFrame.requestedTicks, timeBase: selectedFrame.timeBase, method: selectedFrame.method } } : {}) } };
            const serializeReceipt = () => { const json = JSON.stringify(held, null, 2) + '\n'; if (Buffer.byteLength(json) > receiptLimit(request.kind)) throw Error('交付记录超过' + (receiptLimit(request.kind) / 1024) + ' KiB，不能保存；已有资料和副本保留。'); return json; };
            const preparedJson = serializeReceipt();
            check(); await persistPreparedCopy(directory, fileName, bytes, preparedJson, signal);
            records.set(id, held); committed = receipt;
            if (request.action === 'open') {
                if (signal.aborted) { receipt.message = details + '副本已完成并保留；取消发生在完成后，未自动打开接收应用。'; return receipt; }
                const verified = await read(id);
                if (signal.aborted) { receipt.message = details + '副本已完成并保留；取消发生在完成后，未自动打开接收应用。'; return receipt; }
                openDispatched = true;
                const error = await input.open(verified.path);
                receipt.status = error ? 'open-rejected' : 'open-requested';
                receipt.message = details + (error ? '接收应用未能打开文件；副本仍保留，请选择支持该格式的应用。' : '已请求默认应用打开副本；请在接收应用中核对内容。此状态不代表接收已完成。') + (signal.aborted ? '取消发生在系统打开请求发出后，不能撤回该请求。' : '');
                await fs.writeFile(path.join(directory, 'receipt.json'), serializeReceipt());
            }
            if (signal.aborted && !openDispatched) receipt.message = details + '副本已完成并保留；取消发生在完成后，未自动打开接收应用。';
            return receipt;
        }
        catch (error) {
            if (signal.aborted && committed) { committed.message = openDispatched ? '副本已完成并保留；系统打开请求已发出但结果未确认，取消不能撤回该请求。' : '副本已完成并保留；取消发生在完成后，未继续请求接收应用。'; if (openDispatched) committed.status = 'open-requested'; return committed; }
            if (signal.aborted) { if (error && typeof error === 'object' && 'code' in error && error.code === 'WORK_HANDOFF_CANCELLED') throw error; throw workHandoffCancelled(); }
            throw error;
        }
        finally {
            permit?.release();
        }
        }).finally(() => { owned.delete(job); if (!owned.size && jobs.get(actor) === owned) jobs.delete(actor); job.finish(); });
    };
    const whenIdle = async (actor: string) => { while (jobs.get(actor)?.size) await Promise.all([...jobs.get(actor)!].map(job => job.done)); };
    const cancel = async (actor: string) => { for (const job of jobs.get(actor) ?? []) job.abort.abort(workHandoffCancelled()); await whenIdle(actor); return { message: '本窗交付的取消请求已处理，任务已结束；已完成副本保持。' }; };
    const openExisting = (actor: string, id: string, guard?: (scope?: WorkMediaScope) => void): Promise<WorkHandoffReceipt> => {
        const abort = new AbortController(); let finish!: () => void;
        const job: Job = { abort, done: new Promise<void>(resolve => { finish = resolve; }), finish: () => finish() }, owned = jobs.get(actor) ?? new Set<Job>();
        owned.add(job); jobs.set(actor, owned);
        return serialize(async () => {
            let checkedScope: WorkMediaScope | undefined;
            const check = () => { assertNotCancelled(abort.signal); guard?.(checkedScope); }; let permit: Awaited<ReturnType<VisualAdmission['reserveLocalWork']>> | undefined, dispatched = false;
            try {
                check(); permit = await input.admission?.reserveLocalWork('media', 512 * 1024 * 1024, abort.signal); check();
                const record = await load(id, true);
                checkedScope = { libraryIdentity: record.scope.libraryIdentity, generation: input.host.inspect().generation!, setId: record.scope.setId, assetId: record.scope.assetId }; check();
                if (record.actor !== actor) throw Object.assign(Error('交付副本不属于当前窗口。'), { code: 'WORK_HANDOFF_ACTOR_MISMATCH' });
                const verified = await read(id); check();
                if (immutableRecord(verified.record) !== immutableRecord(record)) throw Error('交付记录已变化，未请求接收应用。');
                const metadata = await readReceipt(id); check();
                const currentMetadata = JSON.parse(Buffer.from(metadata.bytes).toString()) as HeldHandoff;
                if (immutableRecord(currentMetadata) !== immutableRecord(record)) throw Error('交付记录已变化，未请求接收应用。');
                const { directories, metadataBytes } = await retainedDirectories(); check();
                let total = metadataBytes;
                for (const dir of directories) for (const file of await fs.readdir(path.join(input.root, dir.name), { withFileTypes: true })) {
                    check(); if (!file.isFile() || file.isSymbolicLink()) throw Error('交付目录包含未知内容，请检查。');
                    total += (await fs.lstat(path.join(input.root, dir.name, file.name))).size;
                }
                check(); if (directories.length > 64 || total + receiptLimit(record.scope.kind) > 1024 ** 3) throw Error('交付记录更新超过保留预算，未请求接收应用。');
                const finalVerified = await read(id); check();
                const finalRecord = await load(id, true); check();
                if (immutableRecord(finalRecord) !== immutableRecord(record) || finalVerified.path !== verified.path) throw Error('交付副本已变化，未请求接收应用。');
                // No new copy or preparation. A cancellation before this point
                // never reaches the OS; after dispatch it cannot withdraw it.
                dispatched = true;
                let error: string;
                try { error = await input.open(finalVerified.path); } catch { throw Object.assign(Error('系统打开请求已发出，但结果未确认；副本保留，请先核对接收应用，勿盲目重开。'), { code: 'WORK_HANDOFF_OPEN_UNKNOWN' }); }
                guard?.(checkedScope);
                const afterRequest = await read(id); guard?.(checkedScope);
                const afterRecord = await load(id, true); guard?.(checkedScope);
                if (afterRequest.path !== finalVerified.path || immutableRecord(afterRecord) !== immutableRecord(record)) throw Error('系统请求期间副本已变化。');
                record.receipt.status = error ? 'open-rejected' : 'open-requested';
                record.receipt.message = (error ? '接收应用拒绝打开；原交付副本仍保留。' : '已请求默认应用打开已准备的副本；请在接收应用核对，此状态不代表接收完成。') + (abort.signal.aborted ? '取消发生在系统请求发出后，不能撤回该请求。' : '');
                const json = JSON.stringify(record, null, 2) + '\n';
                if (Buffer.byteLength(json) > receiptLimit(record.scope.kind)) throw Error('交付记录更新超过大小上限。');
                const dir = path.join(input.root, id.slice(8)), target = path.join(dir, 'receipt.json'), temporary = path.join(dir, 'receipt-update-' + randomUUID() + '.json');
                let ownedTemporary: { dev: number; ino: number } | undefined;
                try {
                    const current = await readReceipt(id);
                    guard?.(checkedScope);
                    if (current.fileIdentity !== metadata.fileIdentity) throw Error('交付记录在系统请求期间已变化。');
                    const handle = await fs.open(temporary, 'wx');
                    try { const stamp = await handle.stat(); ownedTemporary = { dev: stamp.dev, ino: stamp.ino }; await handle.writeFile(json); await handle.sync(); } finally { await handle.close(); }
                    const stillCurrent = await readReceipt(id);
                    guard?.(checkedScope);
                    if (stillCurrent.fileIdentity !== metadata.fileIdentity) throw Error('交付记录在系统请求期间已变化。');
                    await fs.rename(temporary, target);
                    const saved = await readReceipt(id);
                    guard?.(checkedScope);
                    if (sha(saved.bytes) !== sha(Buffer.from(json))) throw Error('交付记录更新结果未确认。');
                } catch {
                    if (ownedTemporary) { try { const now = await fs.lstat(temporary); if (now.isFile() && !now.isSymbolicLink() && now.dev === ownedTemporary.dev && now.ino === ownedTemporary.ino) await fs.unlink(temporary); } catch { /* Unknown replacements remain for review. */ } }
                    throw Object.assign(Error('系统打开已请求，但交付记录更新未确认；副本保留，请先核对接收应用，勿盲目重开。'), { code: 'WORK_HANDOFF_OPEN_RECORD_UNKNOWN' });
                }
                records.set(id, record); return { ...record.receipt };
            } catch (error) {
                if (abort.signal.aborted && !dispatched) throw workHandoffCancelled('打开交付副本已取消，未请求接收应用；原副本保持。');
                if (dispatched && !(error && typeof error === 'object' && 'code' in error && ['WORK_HANDOFF_OPEN_UNKNOWN', 'WORK_HANDOFF_OPEN_RECORD_UNKNOWN'].includes(String(error.code)))) throw Object.assign(Error('系统打开已请求，但交付结果或记录未确认；副本保留，请先核对接收应用，勿盲目重开。'), { code: 'WORK_HANDOFF_OPEN_RECORD_UNKNOWN' });
                throw error;
            } finally { permit?.release(); }
        }).finally(() => { owned.delete(job); if (!owned.size && jobs.get(actor) === owned) jobs.delete(actor); job.finish(); });
    };
    return { prepare, openExisting, cancel, whenIdle, hasActive: (actor: string) => Boolean(jobs.get(actor)?.size),
        list: async (scope: import('../../shared/contracts/work-media.contract').WorkMediaScope) => {
            await input.host.readWorkMedia(scope);
            let dirs: import('node:fs').Dirent[];
            try {
                dirs = (await retainedDirectories()).directories;
            }
            catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT')
                    return [];
                throw error;
            }
            const receipts: WorkHandoffReceipt[] = [];
            for (const dir of dirs) {
                if (!dir.isDirectory() || dir.isSymbolicLink() || !/^[a-f0-9-]{36}$/.test(dir.name))
                    throw Error('交付目录包含未知内容，请检查。');
                const bytes = await fs.readFile(path.join(input.root, dir.name, 'receipt.json'));
                if (bytes.length > 128 * 1024)
                    throw Error('交付记录无效。');
                const held = JSON.parse(bytes.toString()) as HeldHandoff;
                const storedScope = validateWorkHandoff(held.scope);
                if (bytes.length > receiptLimit(storedScope.kind) || held.receipt.kind !== storedScope.kind) throw Error('交付记录无效。');
                if (held.scope.libraryIdentity === scope.libraryIdentity && held.scope.setId === scope.setId && held.scope.assetId === scope.assetId) {
                    const record = await load('handoff:' + dir.name);
                    receipts.push({ ...record.receipt });
                }
            }
            return receipts;
        },
        readFile: async (id: string) => { const value = await read(id); const kind = value.record.receipt.kind; return { bytes: value.bytes, type: kind === 'zip' ? 'application/zip' : kind === 'processed-image' && value.record.receipt.image ? 'image/' + value.record.receipt.image.format : kind === 'original' && value.record.receipt.fileName.endsWith('.mp4') ? 'video/mp4' : kind === 'original' ? 'application/octet-stream' : kind === 'preview' && value.bytes[0] !== 137 ? 'application/octet-stream' : 'image/png', fileName: value.record.receipt.fileName }; },
        nativeFile: async (actor: string, id: string) => { const checked = await read(id); if (checked.record.actor !== actor)
            throw Error('交付副本不属于当前窗口。'); return {file:checked.path,assetId:checked.record.scope.assetId,kind:checked.record.receipt.kind}; },
        clear: (id: string) => serialize(async () => { const checked = await read(id); await input.trash(checked.path); await fs.unlink(path.join(path.dirname(checked.path), 'receipt.json')); await fs.rmdir(path.dirname(checked.path)); records.delete(id); return { message: '交付副本已移至系统回收站；库中原件和参考帧保持。' }; })
    };
}
