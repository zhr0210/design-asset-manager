import { CHANNEL_EAGLE_PAIRING_INSPECT, CHANNEL_EAGLE_PAIRING_BEGIN, CHANNEL_EAGLE_PAIRING_REVOKE, CHANNEL_EAGLE_COMPANION_ARTIFACT } from '../../shared/contracts/external-connected-library.contract';
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context';
import { CHANNEL_CONNECTED_CLEANUP_CANDIDATES, CHANNEL_CONNECTED_CONFIRM, CHANNEL_CONNECTED_CONFIRM_CLEANUP, CHANNEL_CONNECTED_CONFLICTS, CHANNEL_CONNECTED_DISCONNECT, CHANNEL_CONNECTED_INDEX_NEXT, CHANNEL_CONNECTED_INSPECT, CHANNEL_CONNECTED_LIST, CHANNEL_CONNECTED_MEDIA_PREVIEW, CHANNEL_CONNECTED_OPERATIONS, CHANNEL_CONNECTED_PREPARE, CHANNEL_CONNECTED_PREPARE_NEW, CHANNEL_CONNECTED_PREPARE_FILE, CHANNEL_CONNECTED_QUEUE_LIFECYCLE, CHANNEL_CONNECTED_QUEUE_METADATA, CHANNEL_CONNECTED_RESOLVE_CONFLICT, CHANNEL_CONNECTED_SEARCH, CHANNEL_CONNECTED_SYNC, CHANNEL_LEGACY_CLOSE, CHANNEL_LEGACY_CONFIRM, CHANNEL_LEGACY_INSPECT, CHANNEL_LEGACY_LIST, CHANNEL_LEGACY_MEDIA_PREVIEW, CHANNEL_LEGACY_PREPARE, CHANNEL_LEGACY_SEARCH, type ConnectedLibraryScope, type ConnectedMetadataPatch, type ExternalConnectedLibrary, type LegacyReadOnlyWorkspace } from '../../shared/contracts/external-connected-library.contract';
import { ExternalConnectedLibraryError } from '../external-connected-library';
import type { MainIpcHandleRegistrar } from './ipc-registrar';
import type { EaglePairing } from '../external-connected-library/eagle-pairing';
const ID = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u;
export function registerExternalConnectedLibraryIpc(input: {
    host: ExternalConnectedLibrary;
    legacy: LegacyReadOnlyWorkspace;
    pairing?: EaglePairing;
    companionArtifact?(): Promise<{ fileName: string; bytesBase64: string; sha256: string }>;
    isTrustedSender(event: IpcMainInvokeEvent): boolean;
}, handle: MainIpcHandleRegistrar): void {
    const invoke = async <T>(event: IpcMainInvokeEvent, operation: () => Promise<T> | T) => {
        if (!input.isTrustedSender(event))
            return { success: false, code: 'UNTRUSTED_SENDER', error: 'The request sender is not trusted.' };
        try {
            return { success: true, value: await operation() };
        }
        catch (error) {
            return failure(error);
        }
    };
    handle(CHANNEL_CONNECTED_INSPECT, (event) => invoke(event, () => input.host.inspect()));
    handle(CHANNEL_EAGLE_PAIRING_INSPECT, (event) => invoke(event, async () => input.pairing ? input.pairing.inspect() : { state: 'unpaired' as const, displayName: null, requestedGrant: null, protocolVersion: 1 as const }));
    handle(CHANNEL_EAGLE_COMPANION_ARTIFACT, (event) => invoke(event, async () => {
        if (!input.companionArtifact) throw invalid();
        return input.companionArtifact();
    }));
    handle(CHANNEL_EAGLE_PAIRING_BEGIN, (event, request: unknown) => invoke(event, () => {
        const grant = exact(request, ['requestedGrant']).requestedGrant;
        if (!['read-only', 'read-write'].includes(String(grant)) || !input.pairing) throw invalid();
        return input.pairing.begin(grant as 'read-only' | 'read-write');
    }));
    handle(CHANNEL_EAGLE_PAIRING_REVOKE, (event) => invoke(event, async () => {
        await input.host.disconnect();
        if (!input.pairing) throw invalid();
        return input.pairing.revoke();
    }));
    handle(CHANNEL_CONNECTED_PREPARE, (event, request: unknown) => invoke(event, () => { const record = exact(request, ['scope', 'requestedGrant']); const scope = parseScope(record.scope); const grant = record.requestedGrant; if (grant !== 'read-only' && grant !== 'read-write')
        throw invalid(); return input.host.prepareConnection({ scope, requestedGrant: grant }); }));
    handle(CHANNEL_CONNECTED_CONFIRM, (event, request: unknown) => invoke(event, () => input.host.confirmConnection(fieldId(request, 'receipt'))));
    handle(CHANNEL_CONNECTED_INDEX_NEXT, (event, request: unknown) => invoke(event, () => input.host.indexNextPage(optionalLimit(request))));
    handle(CHANNEL_CONNECTED_LIST, (event) => invoke(event, () => input.host.listItems()));
    handle(CHANNEL_CONNECTED_SEARCH, (event, request: unknown) => invoke(event, () => input.host.searchItems(fieldString(request, 'query', 2000))));
    handle(CHANNEL_CONNECTED_QUEUE_METADATA, (event, request: unknown) => invoke(event, () => { const record = exact(request, ['itemKey', 'clientReceipt', 'patch']); return input.host.queueMetadata({ itemKey: requireId(record.itemKey), clientReceipt: requireId(record.clientReceipt), patch: parsePatch(record.patch) }); }));
    handle(CHANNEL_CONNECTED_PREPARE_NEW, (event, request: unknown) => invoke(event, () => { if (request === undefined)
        return input.host.prepareNewAsset(); const record = exact(request, ['metadata']); return input.host.prepareNewAsset({ metadata: parsePatch(record.metadata) }); }));
    handle(CHANNEL_CONNECTED_PREPARE_FILE, (event, request: unknown) => invoke(event, () => input.host.prepareFileReplacement({ itemKey: fieldId(request, 'itemKey') })));
    handle(CHANNEL_CONNECTED_QUEUE_LIFECYCLE, (event, request: unknown) => invoke(event, () => { const record = exact(request, ['itemKey', 'clientReceipt', 'action']); if (record.action !== 'trash' && record.action !== 'restore')
        throw invalid(); return input.host.queueLifecycle({ itemKey: requireId(record.itemKey), clientReceipt: requireId(record.clientReceipt), action: record.action }); }));
    handle(CHANNEL_CONNECTED_SYNC, (event, request: unknown) => invoke(event, () => input.host.synchronize(optionalLimit(request))));
    handle(CHANNEL_CONNECTED_OPERATIONS, (event) => invoke(event, () => input.host.listOperations()));
    handle(CHANNEL_CONNECTED_CONFLICTS, (event) => invoke(event, () => input.host.listConflicts()));
    handle(CHANNEL_CONNECTED_RESOLVE_CONFLICT, (event, request: unknown) => invoke(event, () => { const record = exact(request, ['conflictId', 'decision']); if (!['use-local', 'use-eagle', 'hold'].includes(String(record.decision)))
        throw invalid(); return input.host.resolveConflict({ conflictId: requireId(record.conflictId), decision: record.decision as 'use-local' | 'use-eagle' | 'hold' }); }));
    handle(CHANNEL_CONNECTED_CLEANUP_CANDIDATES, (event) => invoke(event, () => input.host.listCleanupCandidates()));
    handle(CHANNEL_CONNECTED_CONFIRM_CLEANUP, (event, request: unknown) => invoke(event, () => { const record = exact(request, ['itemKey', 'clientReceipt']); return input.host.confirmPermanentCleanup({ itemKey: requireId(record.itemKey), clientReceipt: requireId(record.clientReceipt) }); }));
    handle(CHANNEL_CONNECTED_MEDIA_PREVIEW, (event, request: unknown) => invoke(event, async () => { const record = exact(request, ['itemKey', 'libraryIdentity', 'generation']); const authority = input.host.inspect(); if (authority.state === 'unconfigured' || authority.libraryIdentity !== requireId(record.libraryIdentity) || authority.generation !== requireId(record.generation))
        throw new ExternalConnectedLibraryError('connected-library-generation-stale'); return Buffer.from(await input.host.readPreview(requireId(record.itemKey))).toString('base64'); }));
    handle(CHANNEL_CONNECTED_DISCONNECT, (event) => invoke(event, async () => {
        await input.host.disconnect();
        await input.pairing?.revoke();
    }));
    handle(CHANNEL_LEGACY_INSPECT, (event) => invoke(event, () => input.legacy.inspect()));
    handle(CHANNEL_LEGACY_PREPARE, (event) => invoke(event, () => input.legacy.prepare()));
    handle(CHANNEL_LEGACY_CONFIRM, (event, request: unknown) => invoke(event, () => input.legacy.confirm(fieldId(request, 'receipt'))));
    handle(CHANNEL_LEGACY_LIST, (event) => invoke(event, () => input.legacy.list()));
    handle(CHANNEL_LEGACY_SEARCH, (event, request: unknown) => invoke(event, () => input.legacy.search(fieldString(request, 'query', 2000))));
    handle(CHANNEL_LEGACY_MEDIA_PREVIEW, (event, request: unknown) => invoke(event, async () => { const record = exact(request, ['assetId', 'identity', 'generation']); const authority = input.legacy.inspect(); if (authority.state !== 'ready' || authority.identity !== requireId(record.identity) || authority.generation !== requireId(record.generation))
        throw invalid(); return Buffer.from(await input.legacy.readPreview(requireId(record.assetId))).toString('base64'); }));
    handle(CHANNEL_LEGACY_CLOSE, (event) => invoke(event, () => input.legacy.close()));
}
function failure(error: unknown) { if (error instanceof ExternalConnectedLibraryError)
    return { success: false, code: error.code, error: error.message }; return { success: false, code: 'CONNECTED_LIBRARY_OPERATION_FAILED', error: 'The connected-library operation failed.' }; }
function invalid() { return new ExternalConnectedLibraryError('connected-library-request-invalid'); }
function exact(value: unknown, keys: readonly string[]): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0'))
    throw invalid(); return value as Record<string, unknown>; }
function requireId(value: unknown): string { if (typeof value !== 'string' || !ID.test(value))
    throw invalid(); return value; }
function fieldId(value: unknown, key: string): string { return requireId(exact(value, [key])[key]); }
function fieldString(value: unknown, key: string, max: number): string { const result = exact(value, [key])[key]; if (typeof result !== 'string' || result.length > max)
    throw invalid(); return result; }
function optionalLimit(value: unknown): number | undefined { if (value === undefined)
    return undefined; const result = exact(value, ['limit']).limit; if (!Number.isSafeInteger(result) || Number(result) < 1 || Number(result) > 1000)
    throw invalid(); return Number(result); }
function parseScope(value: unknown): ConnectedLibraryScope { if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid(); const record = value as Record<string, unknown>; if (record.kind === 'all' && Object.keys(record).length === 1)
    return { kind: 'all' }; if (record.kind === 'folders' && Object.keys(record).sort().join('\0') === 'folderIds\0kind' && Array.isArray(record.folderIds) && record.folderIds.length > 0)
    return { kind: 'folders', folderIds: record.folderIds.map(requireId) }; throw invalid(); }
function parsePatch(value: unknown): ConnectedMetadataPatch { if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid(); const record = value as Record<string, unknown>; const allowed = ['name', 'tags', 'rating', 'annotation', 'folderIds']; if (Object.keys(record).length === 0 || Object.keys(record).some((key) => !allowed.includes(key)))
    throw invalid(); const patch: ConnectedMetadataPatch = {}; if ('name' in record) {
    if (typeof record.name !== 'string')
        throw invalid();
    patch.name = record.name;
} if ('annotation' in record) {
    if (typeof record.annotation !== 'string')
        throw invalid();
    patch.annotation = record.annotation;
} if ('rating' in record) {
    if (!Number.isInteger(record.rating))
        throw invalid();
    patch.rating = Number(record.rating);
} if ('tags' in record) {
    if (!Array.isArray(record.tags))
        throw invalid();
    patch.tags = record.tags.map((item) => boundedString(item, 500));
} if ('folderIds' in record) {
    if (!Array.isArray(record.folderIds))
        throw invalid();
    patch.folderIds = record.folderIds.map(requireId);
} return patch; }
function boundedString(value: unknown, max: number): string { if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw invalid(); return value.trim(); }
