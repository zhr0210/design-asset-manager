import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { VIDEO_RUNTIME_SHA256, VIDEO_RUNTIME_SOURCE_DIGEST } from './video-identity.generated';
import type { VisualAdmission } from '../visual-ai/visual-admission';
export const MAX_VIDEO_BYTES = 96 * 1024 * 1024;
export interface VideoMetadata {
    protocol: 1;
    durationTicks: number;
    width: number;
    height: number;
    fpsNumerator: number;
    fpsDenominator: number;
    actualTicks: number;
}
export interface WorkVideoRuntime {
    identity: string;
    cancelAll?(): void;
    probe(file: string, signal?: AbortSignal): Promise<VideoMetadata>;
    frame(file: string, ticks: number, staging: string, signal?: AbortSignal): Promise<{
        metadata: VideoMetadata;
        png: Uint8Array;
    }>;
}
/** Trusted bundled executable, bounded process and one decode at a time. A
 * permit is released on physical close, including timeout and cancellation. */
export function createWindowsVideoRuntime(input: {
    directory: string;
    admission?: VisualAdmission;
}): WorkVideoRuntime {
    let queue: Promise<unknown> = Promise.resolve();
    const operations = new Set<AbortController>();
    const execute = async (args: string[], signal?: AbortSignal): Promise<VideoMetadata> => {
        if (process.platform !== 'win32' || process.arch !== 'x64')
            throw Error('视频解码当前仅支持 Windows x64。');
        if (signal?.aborted)
            throw Error('视频操作已取消。');
        const abort = signal ?? new AbortController().signal;
        const permit = await input.admission?.reserveLocalWork('media', 512 * 1024 * 1024, abort);
        try {
            const exe = path.join(input.directory, 'video.exe'), info = await fs.lstat(exe);
            if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > 1024 * 1024 || createHash('sha256').update(await fs.readFile(exe)).digest('hex') !== VIDEO_RUNTIME_SHA256)
                throw Error('视频运行文件缺失或已变化，请重新安装。');
            if (signal?.aborted)
                throw Error('视频操作已取消。');
            const stdout = await new Promise<string>((resolve, reject) => {
                const child = spawn(exe, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
                let text = '', failed = false;
                const stop = () => { failed = true; child.kill(); };
                const timer = setTimeout(stop, 30000);
                signal?.addEventListener('abort', stop, { once: true });
                child.stdout.on('data', (bytes: Buffer) => { text += bytes.toString('utf8'); if (text.length > 4096)
                    stop(); });
                child.stderr.on('data', () => { });
                // A failed kill is an error event too. It does not prove process exit.
                child.on('error', () => { failed = true; });
                child.once('close', code => { clearTimeout(timer); signal?.removeEventListener('abort', stop); if (failed || code !== 0)
                    reject(Error(signal?.aborted ? '视频操作已取消。' : '此视频无法解码，支持未旋转的 MP4 视频（最长1小时，最高3840×2160）。'));
                else
                    resolve(text); });
            });
            const data = JSON.parse(stdout) as VideoMetadata;
            if (data.protocol !== 1 || !['durationTicks', 'width', 'height', 'fpsNumerator', 'fpsDenominator', 'actualTicks'].every(key => Number.isSafeInteger(data[key as keyof VideoMetadata])) || data.durationTicks <= 0 || data.durationTicks > 3600 * 1e7 || data.width < 1 || data.width > 3840 || data.height < 1 || data.height > 2160 || data.fpsNumerator < 1 || data.fpsDenominator < 1)
                throw Error('视频元数据不完整。');
            return data;
        }
        finally {
            permit?.release();
        }
    };
    const serialized = <T>(operation: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> => {
        const controller = new AbortController();
        operations.add(controller);
        const effective = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
        const next = queue.then(() => { if (effective.aborted)
            throw Error('视频操作已取消。'); return operation(effective); });
        queue = next.catch(() => { });
        return next.finally(() => operations.delete(controller));
    };
    return { identity: 'windows-media-foundation:' + VIDEO_RUNTIME_SOURCE_DIGEST,
        cancelAll: () => { for (const controller of operations)
            controller.abort(); },
        probe: (file, signal) => serialized(effective => execute([file], effective), signal),
        frame: (file, ticks, staging, signal) => serialized(async (effective) => {
            if (!Number.isSafeInteger(ticks) || ticks < 0)
                throw Error('视频时间无效。');
            const temporary = await fs.mkdtemp(path.join(staging, 'video-decode-')), output = path.join(temporary, 'frame.png');
            try {
                const metadata = await execute([file, output, String(ticks)], effective), info = await fs.lstat(output);
                if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > 64 * 1024 * 1024 || metadata.actualTicks < ticks || metadata.actualTicks >= metadata.durationTicks)
                    throw Error('参考帧未解码到请求位置。');
                return { metadata, png: await fs.readFile(output) };
            }
            finally {
                await fs.rm(output, { force: true });
                await fs.rmdir(temporary);
            }
        }, signal)
    };
}
