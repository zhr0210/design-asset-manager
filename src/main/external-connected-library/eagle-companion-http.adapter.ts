import type { EagleCompanionPort, EagleCompanionRequest, EagleCompanionResponse } from './eagle-companion.port';
export function createEagleCompanionHttpAdapter(input: {
    origin: string;
    fetch?: typeof globalThis.fetch;
    allowSyntheticLoopback?: boolean;
    timeoutMs?: number;
}): EagleCompanionPort {
    const origin = validateCompanionOrigin(input.origin, input.allowSyntheticLoopback === true);
    const fetchImpl = input.fetch ?? globalThis.fetch;
    const timeoutMs = Math.max(250, Math.min(30000, input.timeoutMs ?? 5000));
    return Object.freeze({
        async invoke(request: EagleCompanionRequest): Promise<EagleCompanionResponse> {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetchImpl(`${origin}/v1/dam-eagle-companion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request),
                    signal: controller.signal,
                    redirect: 'error'
                });
                if (!response.ok)
                    return { ok: false, code: 'OPERATION_FAILED' };
                const text = await response.text();
                if (Buffer.byteLength(text) > 48 * 1024 * 1024)
                    return { ok: false, code: 'OPERATION_FAILED' };
                return validateCompanionResponse(JSON.parse(text));
            }
            catch {
                return { ok: false, code: 'OPERATION_FAILED' };
            }
            finally {
                clearTimeout(timeout);
            }
        }
    });
}
function validateCompanionOrigin(value: string, synthetic: boolean): string {
    const url = new URL(value);
    if (url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !url.port)
        throw new Error('EAGLE_COMPANION_ORIGIN_INVALID');
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
        throw new Error('EAGLE_COMPANION_ORIGIN_INVALID');
    if (!synthetic && url.hostname !== '127.0.0.1')
        throw new Error('EAGLE_COMPANION_ORIGIN_INVALID');
    return url.origin;
}
function validateCompanionResponse(value: unknown): EagleCompanionResponse {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return { ok: false, code: 'OPERATION_FAILED' };
    const response = value as Record<string, unknown>;
    if (response.ok === false && ['UNAUTHORIZED', 'INVALID_REQUEST', 'LIBRARY_CHANGED', 'ITEM_UNAVAILABLE', 'STAGING_PATH_REJECTED', 'OPERATION_FAILED'].includes(String(response.code)))
        return response as unknown as EagleCompanionResponse;
    if (response.ok !== true || typeof response.kind !== 'string')
        return { ok: false, code: 'OPERATION_FAILED' };
    if (response.kind === 'capabilities' && typeof response.fileReplace === 'boolean' && typeof response.libraryIdentity === 'string')
        return response as unknown as EagleCompanionResponse;
    if (response.kind === 'item-snapshot' && typeof response.itemId === 'string' && typeof response.contentFingerprint === 'string' && Number.isSafeInteger(response.size))
        return response as unknown as EagleCompanionResponse;
    if (response.kind === 'preview' && typeof response.itemId === 'string' && typeof response.mimeType === 'string' && typeof response.bytesBase64 === 'string')
        return response as unknown as EagleCompanionResponse;
    if (response.kind === 'replace-result' && typeof response.itemId === 'string' && ['applied', 'conflict', 'uncertain'].includes(String(response.state)) && (response.contentFingerprint === null || typeof response.contentFingerprint === 'string'))
        return response as unknown as EagleCompanionResponse;
    return { ok: false, code: 'OPERATION_FAILED' };
}
