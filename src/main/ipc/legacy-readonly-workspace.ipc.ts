import { CHANNEL_LEGACY_CLOSE, CHANNEL_LEGACY_CONFIRM, CHANNEL_LEGACY_INSPECT, CHANNEL_LEGACY_LIST, CHANNEL_LEGACY_MEDIA_PREVIEW, CHANNEL_LEGACY_PREPARE, CHANNEL_LEGACY_SEARCH, type LegacyReadOnlyWorkspace } from '../../shared/contracts/legacy-readonly-workspace.contract'
import type { MainInvokeContext } from '../local-host/client-context'
import type { MainIpcHandleRegistrar } from './ipc-registrar'

const ID = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u
export function registerLegacyReadOnlyWorkspaceIpc(input: { legacy: LegacyReadOnlyWorkspace; isTrustedSender(event: MainInvokeContext): boolean }, handle: MainIpcHandleRegistrar): void {
  const invoke = async <T>(event: MainInvokeContext, operation: () => Promise<T> | T) => {
    if (!input.isTrustedSender(event)) return { success: false, code: 'UNTRUSTED_SENDER', error: 'The request sender is not trusted.' }
    try { return { success: true, value: await operation() } }
    catch { return { success: false, code: 'LEGACY_READONLY_OPERATION_FAILED', error: '旧素材库操作未完成，请核对选择或重试。' } }
  }
  handle(CHANNEL_LEGACY_INSPECT, event => invoke(event, () => input.legacy.inspect()))
  handle(CHANNEL_LEGACY_PREPARE, event => invoke(event, () => input.legacy.prepare()))
  handle(CHANNEL_LEGACY_CONFIRM, (event, request: unknown) => invoke(event, () => input.legacy.confirm(fieldId(request, 'receipt'))))
  handle(CHANNEL_LEGACY_LIST, event => invoke(event, () => input.legacy.list()))
  handle(CHANNEL_LEGACY_SEARCH, (event, request: unknown) => invoke(event, () => input.legacy.search(fieldString(request, 'query', 2000))))
  handle(CHANNEL_LEGACY_MEDIA_PREVIEW, (event, request: unknown) => invoke(event, async () => {
    const record = exact(request, ['assetId', 'identity', 'generation'])
    const authority = input.legacy.inspect()
    if (authority.state !== 'ready' || authority.identity !== requireId(record.identity) || authority.generation !== requireId(record.generation)) throw invalid()
    return Buffer.from(await input.legacy.readPreview(requireId(record.assetId))).toString('base64')
  }))
  handle(CHANNEL_LEGACY_CLOSE, event => invoke(event, () => input.legacy.close()))
}
function invalid() { return new Error('LEGACY_READONLY_REQUEST_INVALID') }
function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')) throw invalid()
  return value as Record<string, unknown>
}
function requireId(value: unknown): string {
  if (typeof value !== 'string' || !ID.test(value)) throw invalid()
  return value
}
function fieldId(value: unknown, key: string): string { return requireId(exact(value, [key])[key]) }
function fieldString(value: unknown, key: string, max: number): string {
  const result = exact(value, [key])[key]
  if (typeof result !== 'string' || result.length > max) throw invalid()
  return result
}
