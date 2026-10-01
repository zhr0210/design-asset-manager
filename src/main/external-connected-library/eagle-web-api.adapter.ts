import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConnectedLibraryScope, ConnectedMetadataPatch, EagleCapabilityProjection } from '../../shared/contracts/external-connected-library.contract';
import type { EagleCompanionPort } from './eagle-companion.port';
import type { EagleProviderConnection, EagleProviderItem, EagleProviderLookupResult, EagleProviderMutationResult, EagleProviderPage, EagleProviderPort } from './eagle-provider.port';
const DEFAULT_EAGLE_WEB_API_ORIGIN = 'http://127.0.0.1:41595';
const RESPONSE_LIMIT_BYTES = 8 * 1024 * 1024;
interface TrustedEagleIdentity {
    providerIdentity: string;
    libraryIdentity: string;
    volumeIdentity: string;
}
export interface CreateEagleWebApiAdapterInput {
    token: string;
    fetch?: typeof globalThis.fetch;
    companion?: EagleCompanionPort;
    /** Supplied only by a reviewed pairing/volume observer. Paths alone are not stable identities. */
    resolveTrustedIdentity?(input: {
        libraryPath: string;
        displayName: string;
    }): Promise<TrustedEagleIdentity>;
    baseUrl?: string;
    allowSyntheticLoopback?: boolean;
    timeoutMs?: number;
    syntheticPermanentDelete?: boolean;
}
class EagleRequestError extends Error {
    constructor(readonly reason: 'timeout' | 'transport' | 'invalid-response') {
        super('EAGLE_REQUEST_UNAVAILABLE');
    }
}
/** Official Eagle Web API v2 Adapter. It never exposes the token or library path. */
export function createEagleWebApiAdapter(input: CreateEagleWebApiAdapterInput): EagleProviderPort {
    if (!/^[A-Za-z0-9._~-]{8,512}$/u.test(input.token))
        throw new Error('EAGLE_TOKEN_INVALID');
    const fetchImpl = input.fetch ?? globalThis.fetch;
    const origin = validateOrigin(input.baseUrl ?? DEFAULT_EAGLE_WEB_API_ORIGIN, input.allowSyntheticLoopback === true);
    const timeoutMs = Math.max(250, Math.min(30000, input.timeoutMs ?? 5000));
    let connection: EagleProviderConnection | null = null;
    let libraryPathDigest: string | null = null;
    const request = async (method: 'GET' | 'POST', endpoint: string, body?: unknown): Promise<unknown> => {
        const official = /^\/api\/v2\/[A-Za-z0-9/-]+$/u.test(endpoint);
        const syntheticDelete = input.allowSyntheticLoopback === true &&
            input.syntheticPermanentDelete === true && endpoint === '/synthetic/v1/permanent-delete';
        if (!official && !syntheticDelete)
            throw new Error('EAGLE_ENDPOINT_INVALID');
        const url = new URL(endpoint, origin);
        url.searchParams.set('token', input.token);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            let response: Response;
            try {
                response = await fetchImpl(url, {
                    method,
                    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
                    body: body === undefined ? undefined : JSON.stringify(body),
                    signal: controller.signal,
                    redirect: 'error'
                });
            }
            catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    throw new EagleRequestError('timeout');
                }
                throw new EagleRequestError('transport');
            }
            if (!response.ok)
                throw new EagleRequestError('transport');
            const text = await response.text();
            if (Buffer.byteLength(text) > RESPONSE_LIMIT_BYTES)
                throw new EagleRequestError('invalid-response');
            let envelope: {
                status?: unknown;
                data?: unknown;
            };
            try {
                envelope = JSON.parse(text) as {
                    status?: unknown;
                    data?: unknown;
                };
            }
            catch {
                throw new EagleRequestError('invalid-response');
            }
            if (envelope.status !== 'success')
                throw new EagleRequestError('invalid-response');
            return envelope.data;
        }
        finally {
            clearTimeout(timeout);
        }
    };
    const negotiate = async (): Promise<EagleProviderConnection | null> => {
        try {
            const [app, library] = await Promise.all([
                request('GET', '/api/v2/app/info'),
                request('GET', '/api/v2/library/info')
            ]);
            const appInfo = requireRecord(app);
            const libraryInfo = requireRecord(library);
            const version = requireString(appInfo.version);
            const buildVersion = parseBuild(appInfo.buildVersion);
            if (compareVersion(version, '4.0.0') < 0 || buildVersion < 21)
                return null;
            const libraryPath = requireString(libraryInfo.path);
            const displayName = requireString(libraryInfo.name);
            const trustedIdentity = input.resolveTrustedIdentity
                ? await input.resolveTrustedIdentity({ libraryPath, displayName })
                : null;
            const fallbackLibraryIdentity = `eagle-library-untrusted:${hash(libraryPath)}`;
            const identity = trustedIdentity ?? {
                providerIdentity: 'eagle-provider:web-api-v2-unpaired',
                libraryIdentity: fallbackLibraryIdentity,
                volumeIdentity: `eagle-volume-untrusted:${hash(path.parse(libraryPath).root || libraryPath)}`
            };
            validateIdentity(identity);
            const companionResponse = trustedIdentity && input.companion
                ? await input.companion.invoke({
                    kind: 'negotiate',
                    sessionToken: input.token,
                    libraryIdentity: identity.libraryIdentity
                }).catch(() => null)
                : null;
            const trustedWrite = trustedIdentity !== null;
            const capabilities: EagleCapabilityProjection = {
                webApiV2: true,
                progressiveIndex: true,
                metadataRead: true,
                metadataWrite: trustedWrite,
                trash: trustedWrite,
                restore: trustedWrite,
                fileReplace: trustedWrite && companionResponse?.ok === true &&
                    companionResponse.kind === 'capabilities' && companionResponse.fileReplace === true &&
                    companionResponse.libraryIdentity === identity.libraryIdentity,
                permanentDelete: trustedWrite && input.allowSyntheticLoopback === true &&
                    input.syntheticPermanentDelete === true
            };
            libraryPathDigest = hash(libraryPath);
            connection = {
                ...identity,
                displayName,
                observedGeneration: `eagle-generation:${hash(`${identity.libraryIdentity}\0${identity.volumeIdentity}\0${String(libraryInfo.modificationTime ?? '')}\0${version}\0${buildVersion}`)}`,
                applicationVersion: version,
                buildVersion,
                evidenceLevel: input.allowSyntheticLoopback ? 'synthetic-protocol' : 'provider-protocol',
                capabilities
            };
            return { ...connection, capabilities: { ...capabilities } };
        }
        catch {
            return null;
        }
    };
    const requireNegotiated = (): EagleProviderConnection => {
        if (!connection || !libraryPathDigest)
            throw new Error('EAGLE_NOT_NEGOTIATED');
        return connection;
    };
    const getItem = async (itemId: string): Promise<EagleProviderLookupResult> => {
        requireNegotiated();
        try {
            const response = await request('POST', '/api/v2/item/get', { ids: [itemId], limit: 1 });
            const record = unwrapItemResponse(response);
            if (!record)
                return { kind: 'missing' };
            return {
                kind: 'found',
                item: await normalizeItem(record, input.companion, input.token, connection!.libraryIdentity)
            };
        }
        catch (error) {
            return { kind: 'unavailable', reason: requestFailureReason(error) };
        }
    };
    const listPage = async ({ cursor, limit }: {
        cursor: string | null;
        limit: number;
        scope: ConnectedLibraryScope;
    }): Promise<EagleProviderPage> => {
        requireNegotiated();
        const offset = cursor === null ? 0 : parseCursor(cursor);
        const response = requireRecord(await request('POST', '/api/v2/item/get', {
            fields: [
                'id', 'name', 'ext', 'tags', 'folders', 'star', 'annotation',
                'size', 'width', 'height', 'modificationTime', 'isDeleted'
            ],
            offset,
            limit
        }));
        const data = Array.isArray(response.data) ? response.data : [];
        const total = requireInteger(response.total);
        const items = await Promise.all(data.map((item) => normalizeItem(requireRecord(item), undefined, input.token, connection!.libraryIdentity)));
        const next = offset + items.length;
        return { items, nextCursor: next < total ? String(next) : null, complete: next >= total };
    };
    const mutate = async (itemId: string, payload: Record<string, unknown>): Promise<EagleProviderMutationResult> => {
        const negotiated = requireNegotiated();
        if (!negotiated.capabilities.metadataWrite)
            return { kind: 'unsupported' };
        try {
            await request('POST', '/api/v2/item/update', { id: itemId, ...payload });
            const verified = await getItem(itemId);
            return verified.kind === 'found' ? { kind: 'applied', item: verified.item } : { kind: 'timeout' };
        }
        catch (error) {
            return requestFailureReason(error) === 'timeout' ? { kind: 'timeout' } : { kind: 'unavailable' };
        }
    };
    const adapter: EagleProviderPort = {
        negotiate,
        listPage,
        getItem,
        async readPreview(itemId) {
            const negotiated = requireNegotiated();
            if (!input.companion || !negotiated.capabilities.fileReplace)
                return null;
            const response = await input.companion.invoke({
                kind: 'read-preview',
                sessionToken: input.token,
                libraryIdentity: negotiated.libraryIdentity,
                itemId,
                maxBytes: 32 * 1024 * 1024
            });
            if (!response.ok || response.kind !== 'preview' || response.itemId !== itemId ||
                !/^image\/[A-Za-z0-9.+-]+$/u.test(response.mimeType))
                return null;
            const bytes = Buffer.from(response.bytesBase64, 'base64');
            return bytes.byteLength > 0 && bytes.byteLength <= 32 * 1024 * 1024
                ? new Uint8Array(bytes)
                : null;
        },
        async updateMetadata(itemId, patch) {
            const mapped: Record<string, unknown> = {};
            if (patch.name !== undefined)
                mapped.name = patch.name;
            if (patch.tags !== undefined)
                mapped.tags = patch.tags;
            if (patch.folderIds !== undefined)
                mapped.folders = patch.folderIds;
            if (patch.annotation !== undefined)
                mapped.annotation = patch.annotation;
            if (patch.rating !== undefined)
                mapped.star = patch.rating;
            return mutate(itemId, mapped);
        },
        async addFile(itemId, stagedFilePath, metadata) {
            const negotiated = requireNegotiated();
            if (!negotiated.capabilities.metadataWrite)
                return { kind: 'unsupported' };
            try {
                await request('POST', '/api/v2/item/add', {
                    id: itemId,
                    path: stagedFilePath,
                    name: metadata.name,
                    tags: metadata.tags,
                    folders: metadata.folderIds,
                    annotation: metadata.annotation
                });
                const verified = await getItem(itemId);
                return verified.kind === 'found' ? { kind: 'applied', item: verified.item } : { kind: 'timeout' };
            }
            catch (error) {
                return requestFailureReason(error) === 'timeout' ? { kind: 'timeout' } : { kind: 'unavailable' };
            }
        },
        async replaceFile(itemId, stagedFilePath, expectedFingerprint, desiredFingerprint) {
            const negotiated = requireNegotiated();
            if (!input.companion || !negotiated.capabilities.fileReplace)
                return { kind: 'unsupported' };
            if (!/^[a-f0-9]{64}$/u.test(expectedFingerprint) || !/^[a-f0-9]{64}$/u.test(desiredFingerprint)) {
                return { kind: 'rejected' };
            }
            const stagedBytes = await fs.readFile(stagedFilePath);
            if (hash(stagedBytes) !== desiredFingerprint)
                return { kind: 'rejected' };
            const response = await input.companion.invoke({
                kind: 'replace-file',
                sessionToken: input.token,
                libraryIdentity: negotiated.libraryIdentity,
                itemId,
                stagedFilePath,
                expectedFingerprint,
                desiredFingerprint
            });
            if (!response.ok || response.kind !== 'replace-result')
                return { kind: 'rejected' };
            if (response.state === 'conflict') {
                const current = await getItem(itemId);
                return { kind: 'conflict', item: current.kind === 'found' ? current.item : null };
            }
            const verified = await getItem(itemId);
            if (verified.kind === 'found' && verified.item.contentFingerprint === desiredFingerprint) {
                return { kind: 'applied', item: verified.item };
            }
            return response.state === 'uncertain' || verified.kind === 'unavailable'
                ? { kind: 'timeout' }
                : { kind: 'rejected' };
        },
        setDeleted: (itemId, deleted) => mutate(itemId, { isDeleted: deleted }),
        async permanentlyDelete(itemId) {
            const negotiated = requireNegotiated();
            if (!negotiated.capabilities.permanentDelete)
                return { kind: 'unsupported' };
            try {
                await request('POST', '/synthetic/v1/permanent-delete', { id: itemId });
                return { kind: 'timeout' };
            }
            catch (error) {
                return requestFailureReason(error) === 'timeout' ? { kind: 'timeout' } : { kind: 'unavailable' };
            }
        },
        async disconnect() {
            connection = null;
            libraryPathDigest = null;
        }
    };
    return Object.freeze(adapter);
}
async function normalizeItem(record: Record<string, unknown>, companion: EagleCompanionPort | undefined, token: string, libraryIdentity: string): Promise<EagleProviderItem> {
    const id = requireId(record.id);
    let fingerprint: string | null = null;
    if (companion) {
        const response = await companion.invoke({
            kind: 'snapshot-item', sessionToken: token, libraryIdentity, itemId: id
        }).catch(() => null);
        if (response?.ok === true && response.kind === 'item-snapshot' && response.itemId === id) {
            fingerprint = response.contentFingerprint;
        }
    }
    const base = {
        id,
        name: requireString(record.name),
        extension: requireString(record.ext),
        tags: requireStringArray(record.tags),
        rating: normalizeRating(record.star),
        annotation: typeof record.annotation === 'string' ? record.annotation : '',
        folderIds: requireStringArray(record.folders),
        size: requireInteger(record.size),
        width: nullableInteger(record.width),
        height: nullableInteger(record.height),
        modifiedAt: requireInteger(record.modificationTime ?? record.modifiedAt),
        contentFingerprint: fingerprint,
        isDeleted: record.isDeleted === true
    };
    return { ...base, version: `eagle-version:${hash(JSON.stringify(base))}` };
}
function unwrapItemResponse(value: unknown): Record<string, unknown> | null {
    if (Array.isArray(value))
        return value[0] ? requireRecord(value[0]) : null;
    const record = requireRecord(value);
    if (Array.isArray(record.data))
        return record.data[0] ? requireRecord(record.data[0]) : null;
    return 'id' in record ? record : null;
}
function requestFailureReason(error: unknown): 'timeout' | 'transport' | 'invalid-response' {
    return error instanceof EagleRequestError ? error.reason : 'invalid-response';
}
function validateIdentity(identity: TrustedEagleIdentity): void {
    const valid = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u;
    if (![identity.providerIdentity, identity.libraryIdentity, identity.volumeIdentity]
        .every((value) => valid.test(value)))
        throw new Error('EAGLE_IDENTITY_INVALID');
}
function validateOrigin(value: string, synthetic: boolean): string {
    const url = new URL(value);
    if (url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('EAGLE_ORIGIN_INVALID');
    }
    if (synthetic) {
        if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
            throw new Error('EAGLE_ORIGIN_INVALID');
    }
    else if (url.origin !== DEFAULT_EAGLE_WEB_API_ORIGIN) {
        throw new Error('EAGLE_ORIGIN_INVALID');
    }
    return url.origin;
}
function parseBuild(value: unknown): number {
    const match = typeof value === 'string' ? /^build(\d+)$/iu.exec(value) : null;
    return match ? Number(match[1]) : 0;
}
function compareVersion(left: string, right: string): number {
    const a = left.split('.').map(Number);
    const b = right.split('.').map(Number);
    for (let index = 0; index < 3; index += 1) {
        const diff = (a[index] ?? 0) - (b[index] ?? 0);
        if (diff)
            return diff;
    }
    return 0;
}
function parseCursor(value: string): number {
    if (!/^(?:0|[1-9]\d*)$/u.test(value))
        throw new Error('EAGLE_CURSOR_INVALID');
    return Number(value);
}
function requireRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('EAGLE_RESPONSE_INVALID');
    return value as Record<string, unknown>;
}
function requireString(value: unknown): string {
    if (typeof value !== 'string' || !value.trim())
        throw new Error('EAGLE_RESPONSE_INVALID');
    return value;
}
function requireId(value: unknown): string {
    const id = requireString(value);
    if (!/^[A-Za-z0-9][A-Za-z0-9._~-]{0,255}$/u.test(id))
        throw new Error('EAGLE_RESPONSE_INVALID');
    return id;
}
function requireInteger(value: unknown): number {
    if (!Number.isSafeInteger(value) || Number(value) < 0)
        throw new Error('EAGLE_RESPONSE_INVALID');
    return Number(value);
}
function nullableInteger(value: unknown): number | null {
    return value === null || value === undefined ? null : requireInteger(value);
}
function normalizeRating(value: unknown): number {
    const rating = requireInteger(value ?? 0);
    if (rating > 5)
        throw new Error('EAGLE_RESPONSE_INVALID');
    return rating;
}
function requireStringArray(value: unknown): string[] {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new Error('EAGLE_RESPONSE_INVALID');
    }
    return value as string[];
}
function hash(value: string | Uint8Array): string {
    return createHash('sha256').update(value).digest('hex');
}
