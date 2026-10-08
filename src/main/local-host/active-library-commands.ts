import {ORGANIZATION_COLORS,validateColorRequest,ORGANIZATION_READ,ORGANIZATION_WRITE,validateOrganizationScope,validateOrganizationWrite} from '../../shared/contracts/library-organization.contract'
import {NOTEBOOK_READ,NOTEBOOK_SAVE,validateNotebook,type NotebookScope,type NotebookSaveRequest} from '../../shared/contracts/asset-notebook.contract'
import { validateAssetSearchRequest } from '../../shared/contracts/asset-search.contract'

import {
  CHANNEL_LIBRARY_ADD_DISPATCH,
  CHANNEL_LIBRARY_ADD_INSPECT,
  CHANNEL_LIBRARY_ADD_PREPARE,
  CHANNEL_LIBRARY_CLOSE,
  CHANNEL_LIBRARY_CREATE_CONFIRM,
  CHANNEL_LIBRARY_CREATE_PREPARE,
  CHANNEL_LIBRARY_INSPECT,
  CHANNEL_LIBRARY_MEDIA_READ_PREVIEW,
  CHANNEL_LIBRARY_OPEN,
  CHANNEL_LIBRARY_REOPEN,
  CHANNEL_LIBRARY_TRASH_DISPATCH,
  CHANNEL_LIBRARY_TRASH_INSPECT,
  CHANNEL_LIBRARY_TRASH_LIST,
  CHANNEL_LIBRARY_TRASH_PREPARE,
  type LibraryMediaReadPreviewRequest,
  type ActiveLibraryHostProjection,
  ActiveLibraryHostError,
  type ActiveLibraryHost
} from '../../shared/contracts/active-library.contract'

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u

export interface ActiveLibraryCommandDependencies {
  host: ActiveLibraryHost
  onAuthorityWillChange?(): void | Promise<void>
  onAuthorityDidChange?(): void | Promise<void>
  onAssetsChanged?(): void
}

export interface ActiveLibraryCommands {
  readonly channels: readonly string[]
  invoke(channel: string, ...args: unknown[]): Promise<any>
}
type CommandHandler = (...args: any[]) => unknown
type CommandRegistrar = (channel: string, handler: CommandHandler) => void

/** One authority queue shared by all authenticated transports. No Electron event is fabricated. */
export function createActiveLibraryCommands(
  dependencies: ActiveLibraryCommandDependencies
): ActiveLibraryCommands {
  const handlers = new Map<string, CommandHandler>()
  const registrar: CommandRegistrar = (channel, handler) => {
    if (handlers.has(channel)) throw new Error('DUPLICATE_LIBRARY_COMMAND')
    handlers.set(channel, handler)
  }
  const changedChannels = new Set([
    CHANNEL_LIBRARY_ADD_DISPATCH, ORGANIZATION_WRITE, NOTEBOOK_SAVE,
    'library-recovery:run', CHANNEL_LIBRARY_TRASH_DISPATCH, 'tag:create', 'tag:update', 'asset-tag:add',
    'asset-tag:remove', 'asset-tag:batch-add', 'asset-tag:batch-remove', 'asset-tag:replace',
    'assets:update-caption', 'assets:reset-caption-edited',
    'tag:create-alias', 'tag:remove-alias', 'tag:set-parent'
  ])
  const handle: CommandRegistrar = (channel, handler) => registrar(channel, async (...args) => {
    const response = await handler(...args)
    if ((response as { success?: boolean })?.success && changedChannels.has(channel)) {
      try { dependencies.onAssetsChanged?.() } catch { /* A notification failure does not undo a committed write. */ }
    }
    return response
  })
  let authorityCycle:Promise<unknown>=Promise.resolve()
  const changingAuthority = <T>(operation: () => Promise<T>): Promise<T> => {
    const current=authorityCycle.then(async()=>{
      try{await dependencies.onAuthorityWillChange?.();return await operation()}
      finally{await dependencies.onAuthorityDidChange?.()}
    })
    authorityCycle=current.catch(()=>{})
    return current
  }
  const invoke = async <T>(operation: () => Promise<T>): Promise<{ success: true; value: T } | { success: false; error: string; code: string }> => {
    try { return { success: true, value: await operation() } } catch (error) {
      if (error instanceof ActiveLibraryHostError && error.name === 'ActiveLibraryHostError') return { success: false, error: error.message, code: error.code }
      return { success: false, error: 'The Active Library operation failed.', code: 'LIBRARY_OPERATION_FAILED' }
    }
  }
  handle(ORGANIZATION_COLORS,(input)=>invoke(()=>dependencies.host.measurePreviewColors(validateColorRequest(input))))
  handle(ORGANIZATION_READ,(input)=>invoke(()=>dependencies.host.readOrganization(validateOrganizationScope(input))))
  handle(ORGANIZATION_WRITE,(input)=>invoke(()=>dependencies.host.writeOrganization(validateOrganizationWrite(input))))
  handle(NOTEBOOK_READ,(input)=>invoke(()=>dependencies.host.readNotebook(requireNotebookRequest(input,false) as NotebookScope)))
  handle(NOTEBOOK_SAVE,(input)=>invoke(()=>dependencies.host.saveNotebook(requireNotebookRequest(input,true) as NotebookSaveRequest)))
  handle('library-recovery:list', () => invoke(() => dependencies.host.listIntakeRecovery()))
  handle('library-recovery:prepare', (input) => invoke(() => {
    if (!input || typeof input.id !== 'string' || !OPAQUE_ID.test(input.id) || Object.keys(input).some(key => !['id','selectSource'].includes(key)) || (input.selectSource !== undefined && typeof input.selectSource !== 'boolean')) throw new Error('Invalid recovery request')
    return dependencies.host.prepareIntakeRecovery(input)
  }))
  handle('library-recovery:run', (input) => invoke(() => dependencies.host.runIntakeRecovery(requireReceipt(input))))
  handle(CHANNEL_LIBRARY_CREATE_PREPARE, () => invoke(() => dependencies.host.prepareCreate()))
  handle(CHANNEL_LIBRARY_INSPECT, () => invoke(async () => dependencies.host.inspect()))
  handle(CHANNEL_LIBRARY_CREATE_CONFIRM, (request: unknown) => invoke(() => { const receipt = requireReceipt(request); return changingAuthority(() => dependencies.host.confirmCreate(receipt)) }))
  handle(CHANNEL_LIBRARY_OPEN, () => invoke(() => changingAuthority(() => dependencies.host.open())))
  handle(CHANNEL_LIBRARY_CLOSE, () => invoke(() => changingAuthority(() => dependencies.host.close())))
  handle(CHANNEL_LIBRARY_REOPEN, () => invoke(() => changingAuthority(() => dependencies.host.reopen())))
  handle(CHANNEL_LIBRARY_ADD_PREPARE, () => invoke(() => dependencies.host.prepareAddAssets()))
  handle(CHANNEL_LIBRARY_ADD_DISPATCH, (request: unknown) => invoke(() => dependencies.host.dispatchAddAssets(requireReceipt(request))))
  handle(CHANNEL_LIBRARY_ADD_INSPECT, (request: unknown) => invoke(() => dependencies.host.inspectCapture(requireSingleId(request, 'batchIdentity'))))
  handle(CHANNEL_LIBRARY_MEDIA_READ_PREVIEW, async (request: unknown) => {
    const result = await invoke(async () => {
      const media = requireMediaRequest(request)
      const authority = dependencies.host.inspect()
      if (authority.state !== 'ready' || authority.identity !== media.libraryIdentity || authority.generation !== media.generation) throw new ActiveLibraryHostError('library-generation-conflict', 'The Active Library generation changed.')
      const bytes = await dependencies.host.readPreview(media.assetId)
      const after = dependencies.host.inspect()
      if (after.state !== 'ready' || after.identity !== media.libraryIdentity || after.generation !== media.generation) throw new ActiveLibraryHostError('library-generation-conflict', 'The Active Library generation changed.')
      return Buffer.from(bytes).toString('base64')
    })
    return result
  })
  handle(CHANNEL_LIBRARY_TRASH_PREPARE, (request: unknown) => invoke(() => dependencies.host.prepareTrash(requireTrashPrepare(request))))
  handle(CHANNEL_LIBRARY_TRASH_DISPATCH, (request: unknown) => invoke(async () => { const result = await dependencies.host.dispatchTrash(requireTrashDispatch(request)); return result }))
  handle(CHANNEL_LIBRARY_TRASH_INSPECT, (request: unknown) => invoke(() => dependencies.host.inspectTrash(requireSingleId(request, 'assetId'))))
  handle(CHANNEL_LIBRARY_TRASH_LIST, () => invoke(() => dependencies.host.listTrash()))
  handle('assets:list', () => invoke(async () => {
    const authority = dependencies.host.inspect()
    const assets = await dependencies.host.listAssets()
    return { assets, identity: authority.identity, generation: authority.generation }
  }))
  handle('asset-search:query', input => invoke(() => dependencies.host.searchAssetPage(validateAssetSearchRequest(input))))
  handle('asset-search:status', () => invoke(() => dependencies.host.readSearchIndex()))
  handle('asset-search:read-assets', (input) => invoke(async () => {
    if (!input || Object.keys(input).some(key=>!['libraryIdentity','generation','ids'].includes(key)) ||
      !Array.isArray(input.ids) || input.ids.length>500 || input.ids.some((id:unknown)=>typeof id!=='string'||!OPAQUE_ID.test(id))) throw Error('ASSET_SEARCH_INPUT_INVALID')
    const authority=dependencies.host.inspect()
    if (authority.state!=='ready'||authority.identity!==input.libraryIdentity||authority.generation!==input.generation) throw new ActiveLibraryHostError('library-generation-conflict','素材库已变化。')
    const result=await dependencies.host.readAssetContext(input.ids)
    const after=dependencies.host.inspect()
    if (after.identity!==authority.identity||after.generation!==authority.generation||after.state!=='ready') throw new ActiveLibraryHostError('library-generation-conflict','素材库已变化。')
    return result.assets
  }))
  handle('asset-search:rebuild', () => invoke(() => dependencies.host.rebuildSearchIndex()))
  handle('tag:search', (request: unknown) => invoke(() => dependencies.host.searchTags(requireStringValue(request))))
  handle('tag:get', (request: unknown) => invoke(() => dependencies.host.getTag(requireIdValue(request))))
  handle('tag:list', () => invoke(() => dependencies.host.listTags()))
  handle('tag-search:assets', (request: unknown) => invoke(() => dependencies.host.searchAssets(requireStringArray(request))))
  handle('tag-search:untagged', () => invoke(() => dependencies.host.searchAssets(['special:untagged'])))
  handle('asset-tag:list-by-asset', (request: unknown) => invoke(() => dependencies.host.listAssetTags(requireSingleId(request, 'assetId'))))
  handle('asset-tag:add', (request: unknown) => invoke(() => dependencies.host.addTagToAsset(requireId(request, 'assetId'), requireId(request, 'tagId'))))
  handle('asset-tag:remove', (request: unknown) => invoke(() => dependencies.host.removeTagFromAsset(requireId(request, 'assetId'), requireId(request, 'tagId'))))
  handle('asset-tag:batch-add', (request: unknown) => invoke(() => { const parsed = requireBatchTagRequest(request); return dependencies.host.batchAddTagsToAssets(parsed.assetIds, parsed.tagIds) }))
  handle('asset-tag:batch-remove', (request: unknown) => invoke(() => { const parsed = requireBatchTagRequest(request); return dependencies.host.batchRemoveTagsFromAssets(parsed.assetIds, parsed.tagIds) }))
  handle('asset-tag:replace', (request: unknown) => invoke(() => { const parsed = requireReplaceTagRequest(request); return dependencies.host.replaceTagForAssets(parsed.assetIds, parsed.oldTagId, parsed.newTagId) }))
  handle('tag:create', (request: unknown) => invoke(async () => ({ tag: await dependencies.host.createTag({ name: requireString(request, 'name'), type: optionalString(request, 'type'), color: optionalString(request, 'color') }) })))
  handle('tag:update', (request: unknown) => invoke(() => { const parsed = requireTagUpdateRequest(request); return dependencies.host.updateTag(parsed.id, parsed.input, parsed.expected) }))
  handle('tag:create-alias', (request: unknown) => invoke(() => {
    rejectExtraFields(request, ['tagId', 'alias'])
    return dependencies.host.createTagAlias(requireId(request, 'tagId'), requireText(request, 'alias'))
  }))
  handle('tag:remove-alias', (request: unknown) => invoke(() => {
    rejectExtraFields(request, ['tagId', 'alias'])
    return dependencies.host.removeTagAlias(requireId(request, 'tagId'), requireText(request, 'alias'))
  }))
  handle('tag:set-parent', (request: unknown) => invoke(() => {
    rejectExtraFields(request, ['tagId', 'parentId', 'expectedParentId'])
    const parentId = Reflect.get(request as object, 'parentId') === null ? null : requireId(request, 'parentId')
    const expected = Reflect.get(request as object, 'expectedParentId')
    if (expected !== undefined && expected !== null && (typeof expected !== 'string' || !OPAQUE_ID.test(expected))) throw Error('INVALID_TAG_BASELINE')
    return dependencies.host.setTagParent(requireId(request, 'tagId'), parentId, expected as string | null | undefined)
  }))
  handle('assets:update-caption', (request: unknown) => invoke(async () => {
    rejectExtraFields(request, ['assetId', 'caption', 'expectedCaption'])
    const result = await dependencies.host.updateAssetCaption(requireId(request, 'assetId'), requireText(request, 'caption'), optionalString(request, 'expectedCaption'))
    return result
  }))
  handle('assets:reset-caption-edited', (request: unknown) => invoke(() => dependencies.host.resetAssetCaptionEdited(requireId(request, 'assetId'))))
  handle('assets:delete', () => {
    return { success: false, error: 'Legacy asset deletion is disabled for Active Library data.', code: 'LEGACY_DELETE_DISABLED' }
  })
  for (const channel of ['ai-worker:run-prompt-reverse', 'assets:apply-path-migration-plan']) {
    handle(channel, () => {
      return { success: false, error: 'This operation is disabled while Active Library authority is in use.', code: 'LIBRARY_FEATURE_DISABLED' }
    })
  }
  return Object.freeze({
    channels: Object.freeze([...handlers.keys()]),
    async invoke(channel: string, ...args: unknown[]) {
      const operation = handlers.get(channel)
      if (!operation) return { success: false, code: 'UNKNOWN_COMMAND', error: 'Unknown library operation.' }
      return operation(...args)
    }
  })
}


function requireString(value: unknown, field: string): string {
  if (!value || typeof value !== 'object' || !(field in value) || typeof Reflect.get(value, field) !== 'string' || !Reflect.get(value, field)) throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  return Reflect.get(value, field)
}

function requireText(value: unknown, field: string): string {
  if (!value || typeof value !== 'object' || typeof Reflect.get(value, field) !== 'string' || Reflect.get(value, field).length > 32000) throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  return Reflect.get(value, field)
}

function rejectExtraFields(value: unknown, allowed: readonly string[]): void {
  if (!value || typeof value !== 'object' || Object.keys(value).some((key) => !allowed.includes(key))) throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
}

function requireReceipt(value: unknown): string { rejectExtraFields(value, ['receipt']); return requireId(value, 'receipt') }

function requireSingleId(value: unknown, field: string): string { rejectExtraFields(value, [field]); return requireId(value, field) }

function requireIdValue(value: unknown): string {
  if (typeof value === 'string' && OPAQUE_ID.test(value)) return value
  if (value && typeof value === 'object' && 'id' in value) return requireId(value, 'id')
  throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
}

function requireStringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'query' in value && typeof Reflect.get(value, 'query') === 'string') return Reflect.get(value, 'query') as string
  throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
}

function requireStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  return value
}

function requireBatchTagRequest(value: unknown): { assetIds: string[]; tagIds: string[] } {
  rejectExtraFields(value, ['assetIds', 'tagIds', 'options'])
  const record = value as { assetIds?: unknown; tagIds?: unknown }
  if (!Array.isArray(record.assetIds) || !Array.isArray(record.tagIds) || record.assetIds.some((id) => typeof id !== 'string') || record.tagIds.some((id) => typeof id !== 'string')) throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  return { assetIds: record.assetIds, tagIds: record.tagIds }
}

function requireReplaceTagRequest(value: unknown): { assetIds: string[]; oldTagId: string; newTagId: string } {
  rejectExtraFields(value, ['assetIds', 'oldTagId', 'newTagId'])
  const record = value as { assetIds?: unknown; oldTagId?: unknown; newTagId?: unknown }
  if (!Array.isArray(record.assetIds) || record.assetIds.some((id) => typeof id !== 'string')) throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  if (typeof record.oldTagId !== 'string' || typeof record.newTagId !== 'string') throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  if (!OPAQUE_ID.test(record.oldTagId) || !OPAQUE_ID.test(record.newTagId)) throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  return { assetIds: record.assetIds, oldTagId: record.oldTagId, newTagId: record.newTagId }
}

function requireTagUpdateRequest(value: unknown): { id: string; input: { name: string; type?: string; color?: string }; expected?: { name: string; type: string; color: string | null } } {
  if (!value || typeof value !== 'object') throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  rejectExtraFields(value, ['id', 'input', 'expected'])
  const record = value as { id?: unknown; input?: unknown; expected?: unknown }
  const id = requireId(record, 'id')
  if (!record.input || typeof record.input !== 'object') throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  rejectExtraFields(record.input, ['name', 'type', 'color'])
  let expected: { name: string; type: string; color: string | null } | undefined
  if (record.expected !== undefined) {
    rejectExtraFields(record.expected, ['name', 'type', 'color'])
    expected = { name: requireString(record.expected, 'name'), type: requireString(record.expected, 'type'), color: Reflect.get(record.expected as object, 'color') === null ? null : requireText(record.expected, 'color') }
  }
  return { id, input: { name: requireString(record.input, 'name'), type: optionalString(record.input, 'type'), color: optionalString(record.input, 'color') }, expected }
}

function requireId(value: unknown, field: string): string {
  const result = requireString(value, field)
  if (!OPAQUE_ID.test(result)) throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  return result
}

function optionalString(value: unknown, field: string): string | undefined {
  if (!value || typeof value !== 'object' || !(field in value)) return undefined
  const result = Reflect.get(value, field)
  if (result === undefined) return undefined
  if (typeof result !== 'string') throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  return result
}

function requireTrashPrepare(value: unknown) {
  rejectExtraFields(value, ['designAssetIdentity', 'expectedRevision'])
  return { designAssetIdentity: requireId(value, 'designAssetIdentity'), expectedRevision: requireId(value, 'expectedRevision') }
}

function requireMediaRequest(value: unknown): LibraryMediaReadPreviewRequest {
  rejectExtraFields(value, ['assetId', 'libraryIdentity', 'generation'])
  return {
    assetId: requireId(value, 'assetId'),
    libraryIdentity: requireId(value, 'libraryIdentity'),
    generation: requireId(value, 'generation')
  }
}

function requireTrashDispatch(value: unknown) {
  if (!value || typeof value !== 'object' || typeof Reflect.get(value, 'kind') !== 'string') throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
  const kind = Reflect.get(value, 'kind')
  if (kind === 'confirm-plan') { rejectExtraFields(value, ['kind', 'planReceipt']); return { kind: 'confirm-plan' as const, planReceipt: requireId(value, 'planReceipt') } }
  if (kind === 'restore-design-asset') { rejectExtraFields(value, ['kind', 'designAssetIdentity', 'expectedRevision']); return { kind: 'restore-design-asset' as const, designAssetIdentity: requireId(value, 'designAssetIdentity'), expectedRevision: requireId(value, 'expectedRevision') } }
  throw new ActiveLibraryHostError('library-operation-failed', 'The request shape is invalid.')
}

export function projectHostState(host: ActiveLibraryHost): ActiveLibraryHostProjection {
  return host.inspect()
}

function requireNotebookRequest(input:unknown,save:boolean):NotebookScope|NotebookSaveRequest {
 rejectExtraFields(input,save?['libraryIdentity','generation','assetId','sessionToken','sourceRef','expectedRevision','allowUpgrade','book']:['libraryIdentity','generation','assetId'])
 const scope={libraryIdentity:requireId(input,'libraryIdentity'),generation:requireId(input,'generation'),assetId:requireId(input,'assetId')}
 if(!save)return scope
 const value=input as Record<string,unknown>
 if(!Number.isSafeInteger(value.expectedRevision)||Number(value.expectedRevision)<0||typeof value.allowUpgrade!=='boolean')throw new Error('INVALID_NOTEBOOK_REQUEST')
 return {...scope,sessionToken:requireId(input,'sessionToken'),sourceRef:requireId(input,'sourceRef'),expectedRevision:Number(value.expectedRevision),allowUpgrade:value.allowUpgrade,book:validateNotebook(value.book)}
}
