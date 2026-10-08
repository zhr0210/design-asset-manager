import type { WorkScope } from './work-set.contract';
import { workId, workRecord, workRevision, validateWorkScope } from './work-set.contract';
export interface ReferenceFrame {
    id: string;
    assetId: string;
    sourceGeneration: string;
    requestedTicks: number;
    actualTicks: number;
    timeBase: 10000000;
    position: number;
    note: string;
    pngSha256: string;
    createdAt: string;
    method: string;
    transform: string;
}
export interface WorkMediaSnapshot {
    schemaVersion: number;
    sessionToken: string;
    setRevision: number;
    revision: number;
    assetId: string;
    sourceGeneration: string;
    sourceUrl: string;
    positionTicks: number;
    selectedFrameId: string | null;
    durationTicks: number | null;
    frames: ReferenceFrame[];
}
export type WorkMediaScope = WorkScope & {
    setId: string;
    assetId: string;
};
export type WorkMediaWrite = WorkMediaScope & {
    sessionToken: string;
    expectedRevision: number;
    command: {
        kind: 'enable';
        allowUpgrade: boolean;
        expectedSchemaVersion: number;
    } | {
        kind: 'capture';
        requestId: string;
        requestedTicks: number;
    } | {
        kind: 'save';
        sourceUrl: string;
        positionTicks: number;
        selectedFrameId: string | null;
        frames: Array<{
            id: string;
            note: string;
        }>;
    } | {
        kind: 'remove';
        frameId: string;
    };
};
export type WorkMediaFile = WorkMediaScope & {
    frameId?: string;
};
export type WorkHandoffKind = 'original' | 'preview' | 'compatible-png' | 'reference-frame';
export type WorkHandoffRequest = WorkMediaScope & {
    kind: WorkHandoffKind;
    frameId?: string;
    action: 'prepare' | 'open';
};
export interface WorkHandoffReceipt {
    id: string;
    fileName: string;
    bytes: number;
    sha256: string;
    kind: WorkHandoffKind;
    status: 'prepared' | 'open-requested' | 'open-rejected';
    message: string;
}
export const WORK_MEDIA_READ = 'work-media:read', WORK_MEDIA_WRITE = 'work-media:write', WORK_MEDIA_CANCEL = 'work-media:cancel', WORK_FILE_HANDOFF = 'work-files:handoff';
export function validateWorkMediaScope(value: unknown): WorkMediaScope {
    const r = workRecord(value, ['libraryIdentity', 'generation', 'setId', 'assetId']);
    return { ...validateWorkScope({ libraryIdentity: r.libraryIdentity, generation: r.generation }), setId: workId(r.setId), assetId: workId(r.assetId) };
}
export function validateWorkSourceUrl(value: unknown): string {
    if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020]/.test(value))
        throw Error('来源网址无效，请使用不含登录信息的公开 HTTP(S) 地址。');
    if (!value)
        return '';
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash || url.search)
        throw Error('来源网址不能包含账号、查询参数或认证信息，请填写公开页面地址。');
    return url.href;
}
const ticks = (value: unknown) => { if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) >= 3600 * 1e7)
    throw Error('视频时间无效。'); return Number(value); };
export function validateWorkMediaWrite(value: unknown): WorkMediaWrite {
    const r = workRecord(value, ['libraryIdentity', 'generation', 'setId', 'assetId', 'sessionToken', 'expectedRevision', 'command']);
    const scope = validateWorkMediaScope({ libraryIdentity: r.libraryIdentity, generation: r.generation, setId: r.setId, assetId: r.assetId });
    if (!Number.isSafeInteger(r.expectedRevision) || Number(r.expectedRevision) < 0)
        throw Error('视频参考版本无效。');
    const base = { ...scope, sessionToken: workId(r.sessionToken), expectedRevision: Number(r.expectedRevision) }, c = workRecord(r.command, ['kind', 'allowUpgrade', 'expectedSchemaVersion', 'requestId', 'requestedTicks', 'sourceUrl', 'positionTicks', 'selectedFrameId', 'frames', 'frameId']);
    if (c.kind === 'enable') {
        workRecord(c, ['kind', 'allowUpgrade', 'expectedSchemaVersion']);
        if (typeof c.allowUpgrade !== 'boolean')
            throw Error('请确认视频存储升级。');
        return { ...base, command: { kind: 'enable', allowUpgrade: c.allowUpgrade, expectedSchemaVersion: workRevision(c.expectedSchemaVersion) } };
    }
    if (c.kind === 'capture') {
        workRecord(c, ['kind', 'requestId', 'requestedTicks']);
        return { ...base, command: { kind: 'capture', requestId: workId(c.requestId), requestedTicks: ticks(c.requestedTicks) } };
    }
    if (c.kind === 'remove') {
        workRecord(c, ['kind', 'frameId']);
        return { ...base, command: { kind: 'remove', frameId: workId(c.frameId) } };
    }
    if (c.kind === 'save') {
        workRecord(c, ['kind', 'sourceUrl', 'positionTicks', 'selectedFrameId', 'frames']);
        if (!Array.isArray(c.frames) || c.frames.length > 100)
            throw Error('每份视频最多100张参考帧。');
        const frames = c.frames.map(frame => { const f = workRecord(frame, ['id', 'note']); if (typeof f.note !== 'string' || f.note.length > 4000)
            throw Error('参考帧备注过长。'); return { id: workId(f.id), note: f.note }; });
        if (new Set(frames.map(f => f.id)).size !== frames.length)
            throw Error('参考帧顺序无效。');
        return { ...base, command: { kind: 'save', sourceUrl: validateWorkSourceUrl(c.sourceUrl), positionTicks: ticks(c.positionTicks), selectedFrameId: c.selectedFrameId === null ? null : workId(c.selectedFrameId), frames } };
    }
    throw Error('视频操作无效。');
}
export function validateWorkHandoff(value: unknown): WorkHandoffRequest {
    const r = workRecord(value, ['libraryIdentity', 'generation', 'setId', 'assetId', 'kind', 'frameId', 'action']);
    const scope = validateWorkMediaScope({ libraryIdentity: r.libraryIdentity, generation: r.generation, setId: r.setId, assetId: r.assetId });
    if (!['original', 'preview', 'compatible-png', 'reference-frame'].includes(String(r.kind)) || !['prepare', 'open'].includes(String(r.action)) || (r.kind === 'reference-frame') !== (r.frameId !== undefined))
        throw Error('文件交付选项无效。');
    return { ...scope, kind: r.kind as WorkHandoffKind, action: r.action as WorkHandoffRequest['action'], ...(r.frameId !== undefined ? { frameId: workId(r.frameId) } : {}) };
}
