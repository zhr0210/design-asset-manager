import type { ActiveLibraryHost } from '../../shared/contracts/active-library.contract';
import { validateWorkScope, workRecord, workId } from '../../shared/contracts/work-set.contract';
import { validateWorkMediaScope, validateWorkMediaWrite, validateWorkHandoff } from '../../shared/contracts/work-media.contract';
import type { createWorkFileHandoffs } from './work-file-handoff';
export function createWorkMediaController(input: {
    host: ActiveLibraryHost;
    files: ReturnType<typeof createWorkFileHandoffs>;
    changed: () => void;
}) {
    const running = new Map<string, { abort: AbortController; done: Promise<void> }>();
    const result = async <T>(fn: () => T | Promise<T>) => { try {
        return { success: true as const, value: await fn() };
    }
    catch (error) {
        return { success: false as const, error: error instanceof Error ? error.message : '操作未完成。', code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'WORK_MEDIA_FAILED' };
    } };
    const status = (value: unknown) => result(() => input.host.workMediaStatus(validateWorkScope(value)));
    const enable = (value: unknown) => result(async () => {
        const r = workRecord(value, ['libraryIdentity', 'generation', 'sessionToken', 'allowUpgrade', 'expectedSchemaVersion']), scope = validateWorkScope({ libraryIdentity: r.libraryIdentity, generation: r.generation });
        if (typeof r.allowUpgrade !== 'boolean' || !Number.isInteger(r.expectedSchemaVersion))
            throw Error('视频存储升级参数无效。');
        await input.host.enableWorkMedia({ ...scope, sessionToken: workId(r.sessionToken), allowUpgrade: r.allowUpgrade, expectedSchemaVersion: Number(r.expectedSchemaVersion) });
        input.changed();
        return input.host.workMediaStatus(scope);
    });
    const read = (value: unknown) => result(() => input.host.readWorkMedia(validateWorkMediaScope(value)));
    const write = (actor: string, value: unknown) => result(async () => {
        const request = validateWorkMediaWrite(value), key = actor;
        if (running.has(key))
            throw Error('当前视频操作尚未结束，请先等待或取消。');
        const abort = new AbortController();
        let finish!: () => void;
        const held = { abort, done: new Promise<void>(resolve => { finish = resolve; }) };
        running.set(key, held);
        try {
            const saved = await input.host.writeWorkMedia(request, abort.signal);
            input.changed();
            return saved;
        }
        catch (error) {
            // Cancellation can occur before the decoder, while the Host lease
            // is still queued. Reconcile saved state instead of claiming rollback.
            if (abort.signal.aborted) throw Object.assign(Error('取消请求已处理；请核对当前保存内容后再操作。未确认退出的运行时仍保留占用。'), { code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'WORK_MEDIA_CANCELLED' });
            throw error;
        }
        finally {
            if (running.get(key) === held)
                running.delete(key);
            finish();
        }
    });
    const whenIdle = async (actor: string) => { while (running.has(actor) || input.files.hasActive(actor)) await Promise.all([running.get(actor)?.done, input.files.whenIdle(actor)]); };
    const revoke = async (actor: string) => { running.get(actor)?.abort.abort(); await input.files.cancel(actor); await whenIdle(actor); };
    const cancel = (actor: string, value: unknown) => result(async () => {
        workRecord(value, []); const held = running.get(actor); held?.abort.abort();
        await Promise.all([input.files.cancel(actor), held?.done]);
        await whenIdle(actor);
        return { message: '本窗操作的取消请求已处理，正在执行的操作已返回确认；已完成内容和副本保持。未确认退出的运行时仍保留占用。' };
    });
    return { status, enable, read, write, cancel, files: input.files,
        listFiles: (value: unknown) => result(() => input.files.list(validateWorkMediaScope(value))),
        handoff: (actor: string, value: unknown) => result(() => input.files.prepare(actor, validateWorkHandoff(value))),
        clear: (value: unknown) => result(() => { const r = workRecord(value, ['id', 'receiverFinished']); if (r.receiverFinished !== true)
            throw Error('请先确认接收应用已经读完交付副本。'); return input.files.clear(workId(r.id)); }),
        hasActive: (actor: string) => running.has(actor) || input.files.hasActive(actor), whenIdle, revoke
    };
}
