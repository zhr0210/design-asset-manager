import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { ActiveLibraryHost } from '../../shared/contracts/active-library.contract';
import type { WorkHandoffReceipt, WorkHandoffRequest } from '../../shared/contracts/work-media.contract';
import { validateWorkHandoff } from '../../shared/contracts/work-media.contract';
import type { VisualAdmission } from '../visual-ai/visual-admission';
import { readVerifiedOwnedFile } from '../platform/verified-owned-file';
interface HeldHandoff {
    receipt: WorkHandoffReceipt;
    scope: WorkHandoffRequest;
    actor: string;
    sourceGeneration: string;
    provenance?: {
        sourceUrl: string;
        transform: string;
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
    let queue: Promise<unknown> = Promise.resolve();
    const serialize = <T>(fn: () => Promise<T>) => { const next = queue.then(fn); queue = next.catch(() => { }); return next; };
    const load = async (id: string) => {
        if (!/^handoff:[a-f0-9-]{36}$/.test(id))
            throw Error('交付记录无效。');
        let record = records.get(id);
        if (!record) {
            const dir = path.join(input.root, id.slice(8)), info = await fs.lstat(dir);
            if (!info.isDirectory() || info.isSymbolicLink())
                throw Error('交付目录已变化。');
            const bytes = await fs.readFile(path.join(dir, 'receipt.json'));
            if (bytes.length > 16384)
                throw Error('交付记录无效。');
            record = JSON.parse(bytes.toString()) as HeldHandoff;
            if (record.receipt.id !== id)
                throw Error('交付记录无效。');
            records.set(id, record);
        }
        const current = input.host.inspect();
        if (current.state !== 'ready' || current.identity !== record.scope.libraryIdentity || !current.generation)
            throw Error('请先授权打开交付副本所属的素材库。');
        const info = await input.host.readWorkMedia({ libraryIdentity: record.scope.libraryIdentity, generation: current.generation, setId: record.scope.setId, assetId: record.scope.assetId });
        if (info.sourceGeneration !== record.sourceGeneration)
            throw Error('素材来源已变化，请重新准备交付。');
        return record;
    };
    const read = async (id: string) => {
        const record = await load(id), relative = id.slice(8) + '/' + record.receipt.fileName;
        const file = await readVerifiedOwnedFile({ root: input.root, role: input.root, relative, expectedSize: record.receipt.bytes, expectedDigest: record.receipt.sha256, maximumBytes: 96 * 1024 * 1024 });
        await load(id);
        return { record, bytes: file.bytes, path: path.join(input.root, relative) };
    };
    const prepare = (actor: string, value: WorkHandoffRequest): Promise<WorkHandoffReceipt> => serialize(async () => {
        const request = validateWorkHandoff(value), scope = { libraryIdentity: request.libraryIdentity, generation: request.generation, setId: request.setId, assetId: request.assetId };
        const permit = await input.admission?.reserveLocalWork('media', 512 * 1024 * 1024, new AbortController().signal);
        try {
            const before = await input.host.readWorkMedia(scope), asset = (await input.host.readAssetContext([scope.assetId])).assets[0];
            if (!asset)
                throw Error('素材不可用。');
            const selectedFrame = request.frameId ? before.frames.find(frame => frame.id === request.frameId) : undefined;
            if (request.frameId && !selectedFrame)
                throw Error('所选参考帧已变化，请重新选择。');
            let bytes: Uint8Array, extension: string;
            if (request.kind === 'reference-frame') {
                const frame = await input.host.readWorkMediaFile({ ...scope, frameId: request.frameId });
                bytes = frame.bytes;
                extension = 'png';
            }
            else if (request.kind === 'preview') {
                bytes = await input.host.readPreview(scope.assetId);
                extension = bytes[0] === 137 ? 'png' : bytes[0] === 255 ? 'jpg' : 'webp';
            }
            else {
                const original = await input.host.readWorkMediaFile(scope);
                if (request.kind === 'compatible-png') {
                    if (original.type === 'video/mp4')
                        throw Error('视频请交付原视频或选定参考帧；PNG 不能替代整段视频。');
                    bytes = await sharp(original.bytes, { limitInputPixels: 16 * 1024 * 1024 }).rotate().png().toBuffer();
                    extension = 'png';
                }
                else {
                    bytes = original.bytes;
                    extension = path.extname(original.fileName).slice(1);
                }
            }
            if (bytes.length > 96 * 1024 * 1024)
                throw Error('交付文件超过96 MiB，请使用外部应用显式导出。');
            const after = await input.host.readWorkMedia(scope);
            if (after.sourceGeneration !== before.sourceGeneration)
                throw Error('素材已变化，未交付旧版本。');
            await fs.mkdir(input.root, { recursive: true });
            const rootInfo = await fs.lstat(input.root);
            if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink())
                throw Error('交付目录无效。');
            const directories = await fs.readdir(input.root, { withFileTypes: true });
            let retainedBytes = 0;
            for (const dir of directories) {
                if (!dir.isDirectory() || dir.isSymbolicLink() || !/^handoff-[a-f0-9-]{36}$/.test('handoff-' + dir.name))
                    throw Error('交付目录包含未知内容，请检查。');
                for (const file of await fs.readdir(path.join(input.root, dir.name), { withFileTypes: true })) {
                    if (!file.isFile() || file.isSymbolicLink())
                        throw Error('交付目录包含未知内容，请检查。');
                    retainedBytes += (await fs.stat(path.join(input.root, dir.name, file.name))).size;
                }
            }
            if (directories.length >= 64 || retainedBytes + bytes.length > 1024 * 1024 * 1024)
                throw Error('交付副本达到保留上限（64份或1 GiB），请在接收应用读完后清理。');
            const id = 'handoff:' + randomUUID(), directory = path.join(input.root, id.slice(8));
            await fs.mkdir(directory);
            const stem = path.basename(asset.fileName, path.extname(asset.fileName)).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 100) || '素材';
            const fileName = stem + ' ' + (request.kind === 'original' ? '原件副本' : request.kind === 'preview' ? '预览副本' : request.kind === 'reference-frame' ? '参考帧 ' + (selectedFrame!.actualTicks / 1e7).toFixed(7) + 's' : '兼容导出') + '.' + extension;
            const file = path.join(directory, fileName);
            await fs.writeFile(file, bytes, { flag: 'wx' });
            const descriptor = await fs.open(file, 'r+');
            try {
                await descriptor.sync();
            }
            finally {
                await descriptor.close();
            }
            const receipt: WorkHandoffReceipt = { id, fileName, bytes: bytes.length, sha256: sha(bytes), kind: request.kind, status: 'prepared', message: '交付副本已准备；不会自动清理，请在接收应用读完后明确清理。' };
            const held: HeldHandoff = { receipt, scope: request, actor, sourceGeneration: before.sourceGeneration, provenance: { sourceUrl: before.sourceUrl, transform: request.kind === 'compatible-png' ? 'sharp-auto-orient/full-resolution/png' : request.kind === 'preview' ? 'required-preview' : selectedFrame?.transform ?? 'byte-identical-original-copy', ...(selectedFrame ? { frame: { actualTicks: selectedFrame.actualTicks, requestedTicks: selectedFrame.requestedTicks, timeBase: selectedFrame.timeBase, method: selectedFrame.method } } : {}) } };
            records.set(id, held);
            await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(held, null, 2) + '\n', { flag: 'wx' });
            if (request.action === 'open') {
                const verified = await read(id), error = await input.open(verified.path);
                receipt.status = error ? 'open-rejected' : 'open-requested';
                receipt.message = error ? '接收应用未能打开文件；副本仍保留，请选择支持该格式的应用。' : '已请求默认应用打开副本；请在接收应用中核对内容。此状态不代表接收已完成。';
                await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(held, null, 2) + '\n');
            }
            return receipt;
        }
        finally {
            permit?.release();
        }
    });
    return { prepare,
        list: async (scope: import('../../shared/contracts/work-media.contract').WorkMediaScope) => {
            await input.host.readWorkMedia(scope);
            let dirs: import('node:fs').Dirent[];
            try {
                dirs = await fs.readdir(input.root, { withFileTypes: true });
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
                if (bytes.length > 16384)
                    throw Error('交付记录无效。');
                const held = JSON.parse(bytes.toString()) as HeldHandoff;
                if (held.scope.libraryIdentity === scope.libraryIdentity && held.scope.setId === scope.setId && held.scope.assetId === scope.assetId) {
                    const record = await load('handoff:' + dir.name);
                    receipts.push({ ...record.receipt });
                }
            }
            return receipts;
        },
        readFile: async (id: string) => { const value = await read(id); const kind = value.record.receipt.kind; return { bytes: value.bytes, type: kind === 'original' && value.record.receipt.fileName.endsWith('.mp4') ? 'video/mp4' : kind === 'original' ? 'application/octet-stream' : kind === 'preview' && value.bytes[0] !== 137 ? 'application/octet-stream' : 'image/png', fileName: value.record.receipt.fileName }; },
        nativeFile: async (actor: string, id: string) => { const checked = await read(id); if (checked.record.actor !== actor)
            throw Error('交付副本不属于当前窗口。'); return checked.path; },
        clear: (id: string) => serialize(async () => { const checked = await read(id); await input.trash(checked.path); await fs.unlink(path.join(path.dirname(checked.path), 'receipt.json')); await fs.rmdir(path.dirname(checked.path)); records.delete(id); return { message: '交付副本已移至系统回收站；库中原件和参考帧保持。' }; })
    };
}
