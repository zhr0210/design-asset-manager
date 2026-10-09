import path from 'node:path';
import archiver from 'archiver';

// Locked MIT archiver 7.0.1 is a production dependency. This adapter deliberately
// exposes buffer append only, never glob/directory/file APIs or arbitrary shell.
export const WORK_ZIP_MAX_BYTES = 96 * 1024 * 1024;
export interface WorkZipInput { name: string; bytes: Uint8Array }
export function workHandoffCancelled(message = '文件交付已取消；已完成的副本保持。') { return Object.assign(Error(message), { code: 'WORK_HANDOFF_CANCELLED' }); }

function truncateUtf8(value: string, maximum: number) {
    let result = '', bytes = 0;
    for (const char of value) { const size = Buffer.byteLength(char); if (bytes + size > maximum) break; result += char; bytes += size; }
    return result;
}
/** Flat, Unicode-normalized, receiver-safe names; deterministic case-fold collision suffix. */
export function workZipEntryNames(names: readonly string[]): string[] {
    const used = new Set<string>();
    return names.map(name => {
        const flat = path.posix.basename(name.replace(/\\/g, '/')).normalize('NFC').replace(/[\u0000-\u001f\u007f/:*?"<>|]/g, '-').replace(/[. ]+$/g, '').replace(/^\.+/, '') || '素材';
        const extension = truncateUtf8(path.posix.extname(flat), 16), rawStem = flat.slice(0, flat.length - path.posix.extname(flat).length);
        let stem = truncateUtf8(rawStem || '素材', 90);
        if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(stem)) stem = '_' + stem;
        let candidate = stem + extension, counter = 1;
        while (used.has(candidate.toLocaleLowerCase('en-US'))) candidate = stem + ' (' + (++counter) + ')' + extension;
        used.add(candidate.toLocaleLowerCase('en-US'));
        return candidate;
    });
}

export function createBoundedWorkZip(entries: readonly WorkZipInput[], maximumBytes = WORK_ZIP_MAX_BYTES, signal?: AbortSignal): Promise<Buffer> {
    if (signal?.aborted) return Promise.reject(workHandoffCancelled());
    if (entries.length < 1 || entries.length > 64 || !Number.isSafeInteger(maximumBytes) || maximumBytes < 1 || maximumBytes > WORK_ZIP_MAX_BYTES || entries.reduce((sum, entry) => sum + entry.bytes.length, 0) > WORK_ZIP_MAX_BYTES)
        return Promise.reject(Error('ZIP总输入或输出预算无效（最多64项、96 MiB）。'));
    const names = workZipEntryNames(entries.map(entry => entry.name));
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 6 } }), chunks: Buffer[] = [];
        let total = 0, settled = false, ended = false, writableFinished = false, failure: Error | undefined;
        const fail = (error: unknown) => {
            if (settled || failure) return;
            failure = error instanceof Error ? error : Error('ZIP归档失败。');
            // abort() kills pending entries but permits the owned active buffer
            // compression callback to finish. Destroying immediately would emit
            // close while that work could still be executing.
            archive.abort();
            if (writableFinished) archive.destroy();
        };
        const onAbort = () => fail(workHandoffCancelled());
        signal?.addEventListener('abort', onAbort, { once: true });
        archive.on('error', fail); archive.on('warning', fail);
        archive.on('data', (chunk: Buffer) => { if (failure) return; total += chunk.length; if (total > maximumBytes) { fail(Error('ZIP输出超过96 MiB预算，未交付副本。')); return; } chunks.push(chunk); });
        archive.on('finish', () => { writableFinished = true; if (failure || ended) archive.destroy(); });
        archive.on('end', () => { ended = true; if (writableFinished) archive.destroy(); });
        archive.on('close', () => { if (settled) return; settled = true; signal?.removeEventListener('abort', onAbort); if (failure) reject(failure); else if (ended && writableFinished) resolve(Buffer.concat(chunks, total)); else reject(Error('ZIP归档提前关闭，未交付副本。')); });
        try {
            for (const [index, entry] of entries.entries()) archive.append(Buffer.from(entry.bytes.buffer, entry.bytes.byteOffset, entry.bytes.byteLength), { name: names[index], date: new Date('1980-01-01T00:00:00Z'), mode: 0o644 });
            void archive.finalize().catch(fail);
        } catch (error) { fail(error); }
    });
}
