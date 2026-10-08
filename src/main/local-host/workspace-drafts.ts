import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { WorkspaceDraftInput, WorkspaceDraftRecord, WorkspaceDraftScope, WorkspaceDraftOrder, WorkspaceDraftRemoveInput, WorkspaceDraftRecoverInput, WorkspaceDraftDiscardInput } from '../../shared/contracts/workspace-draft.contract'

interface Stored extends WorkspaceDraftScope { value: unknown; base: unknown; writerId?: string; sequence?: number; id: string; owner: string; revision: number; updatedAt: number; clientKind: WorkspaceDraftRecord['clientKind'] }
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(value)
const kinds = ['description', 'prompt', 'notebook', 'ocr', 'work-set','work-media']
const entity=(scope:WorkspaceDraftScope)=>scope.kind==='work-media'?typeof scope.entityId==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,1023}$/.test(scope.entityId):id(scope.entityId)

/** Separate profile-owned recovery data. This module never writes an Asset Library. */
export function createWorkspaceDrafts(input: { directory: string; current(): { identity: string | null; generation: string | null } }) {
  fs.mkdirSync(input.directory, { recursive: true })
  const file = path.join(input.directory, 'workspace-drafts.v1.json')
  if (fs.existsSync(file) && (fs.lstatSync(file).isSymbolicLink() || fs.statSync(file).size > 16 * 1024 * 1024)) throw Error('DRAFT_STORAGE_INVALID')
  const records = new Map<string, Stored>()
  const active = new Set<string>()
  const writers = new Map<string, { current: string; revoked: Set<string> }>()
  const highWater = new Map<string, number>()
  const fenced = new Set<string>()
  const completed = new Map<string, { scope: WorkspaceDraftScope; fingerprint: string; result: WorkspaceDraftRecord | undefined }>()
  const latestReceipt = new Map<string, string>()
  let revision = 0
  let queue: Promise<unknown> = Promise.resolve()
  const serial = <T>(operation: () => T): Promise<T> => {
    const task = queue.then(operation)
    queue = task.catch(() => {})
    return task
  }
  const validateScope = (scope: WorkspaceDraftScope) => {
    if (!scope || !id(scope.libraryIdentity) || !id(scope.generation) || !entity(scope) || !kinds.includes(scope.kind)) throw Error('INVALID_DRAFT')
    const current = input.current()
    if (scope.libraryIdentity !== current.identity || scope.generation !== current.generation) throw Error('DRAFT_SCOPE_EXPIRED')
  }
  const validContent = (draft: WorkspaceDraftScope & { value: unknown; base: unknown }) => {
    if (!draft || !id(draft.libraryIdentity) || !id(draft.generation) || !entity(draft) || !kinds.includes(draft.kind)) throw Error('INVALID_DRAFT')
    if (['description', 'prompt', 'ocr'].includes(draft.kind) && (typeof draft.value !== 'string' || draft.value.length > 32000)) throw Error('INVALID_DRAFT')
    const encoded = JSON.stringify({ value: draft.value, base: draft.base })
    if (!encoded || Buffer.byteLength(encoded) > 512 * 1024) throw Error('DRAFT_TOO_LARGE')
  }
  if (fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (saved.version !== 1 || !Array.isArray(saved.records) || saved.records.length > 1000) throw Error('DRAFT_STORAGE_INVALID')
    for (const record of saved.records as Stored[]) {
      validContent(record)
      if (!id(record.id) || !Number.isSafeInteger(record.revision) || typeof record.owner !== 'string') throw Error('DRAFT_STORAGE_INVALID')
      if ((record.writerId !== undefined && !id(record.writerId)) || (record.sequence !== undefined && (!Number.isSafeInteger(record.sequence) || record.sequence < 1))) throw Error('DRAFT_STORAGE_INVALID')
      records.set(record.id, record)
      revision = Math.max(revision, record.revision)
    }
  }
  const persist = () => {
    const contents = JSON.stringify({ version: 1, records: [...records.values()] })
    if (Buffer.byteLength(contents) > 16 * 1024 * 1024) throw Error('DRAFT_STORAGE_FULL')
    const temporary = path.join(input.directory, `drafts-${randomUUID()}.pending`)
    fs.writeFileSync(temporary, contents, { flag: 'wx' })
    try { fs.renameSync(temporary, file) } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) }
  }
  const project = (owner: string, record: Stored): WorkspaceDraftRecord => {
    const { owner: storedOwner, ...value } = record
    return structuredClone({ ...value, owned: owner === storedOwner, activeElsewhere: owner !== storedOwner && active.has(storedOwner) })
  }
  const sameScope = (left: WorkspaceDraftScope, right: WorkspaceDraftScope) => left.libraryIdentity === right.libraryIdentity && left.kind === right.kind && left.entityId === right.entityId
  const ownedRecord = (owner: string, scope: WorkspaceDraftScope) => [...records.values()].find(record => record.owner === owner && sameScope(record, scope))
  const scopeKey = (owner: string, writerId: string, scope: WorkspaceDraftScope) => JSON.stringify([owner, writerId, scope.libraryIdentity, scope.generation, scope.kind, scope.entityId])
  const receiptKey = (owner: string, order: WorkspaceDraftOrder) => JSON.stringify([owner, order.writerId, order.sequence])
  const validateWriter = (owner: string, order: WorkspaceDraftOrder) => {
    if (!order || !id(order.writerId) || !Number.isSafeInteger(order.sequence) || order.sequence < 1) throw Error('INVALID_DRAFT_ORDER')
    if (writers.get(owner)?.current !== order.writerId) throw Error('DRAFT_WRITER_EXPIRED')
  }
  const replay = (owner: string, order: WorkspaceDraftOrder, fingerprint: string) => {
    validateWriter(owner, order)
    const receipt = completed.get(receiptKey(owner, order))
    if (!receipt) return undefined
    const key = scopeKey(owner, order.writerId, receipt.scope)
    validateScope(receipt.scope)
    if (fenced.has(key) || order.sequence < (highWater.get(key) ?? 0)) throw Error('DRAFT_STALE_UPDATE')
    if (receipt.fingerprint !== fingerprint) throw Error('DRAFT_SEQUENCE_CONFLICT')
    return receipt
  }
  const ordered = <T extends WorkspaceDraftRecord | undefined>(owner: string, scope: WorkspaceDraftScope, order: WorkspaceDraftOrder, fingerprint: string, operation: () => T): T => {
    validateScope(scope); validateWriter(owner, order)
    const key = scopeKey(owner, order.writerId, scope)
    if (fenced.has(key) || order.sequence <= (highWater.get(key) ?? 0)) throw Error('DRAFT_STALE_UPDATE')
    const result = operation()
    const previousReceipt = latestReceipt.get(key)
    if (previousReceipt) completed.delete(previousReceipt)
    latestReceipt.set(key, receiptKey(owner, order))
    highWater.set(key, order.sequence)
    completed.set(receiptKey(owner, order), { scope: { libraryIdentity: scope.libraryIdentity, generation: scope.generation, kind: scope.kind, entityId: scope.entityId }, fingerprint, result: result && structuredClone(result) })
    return result
  }
  const fencePreviousOwner = (owner: string, record: Stored, generation: string) => {
    if (record.owner !== owner) {
      const writer = writers.get(record.owner)?.current
      if (writer) {
        fenced.add(scopeKey(record.owner, writer, record))
        fenced.add(scopeKey(record.owner, writer, { ...record, generation }))
      }
    }
  }
  return Object.freeze({
    /** A new document revokes its owner's prior epoch; counters may restart at one. */
    beginWriter(owner: string, writerId: string) {
      if (!id(writerId)) throw Error('INVALID_DRAFT_WRITER')
      const state = writers.get(owner)
      if (state?.current === writerId) return
      if (state?.revoked.has(writerId)) throw Error('DRAFT_WRITER_EXPIRED')
      const revoked = state?.revoked ?? new Set<string>()
      if (state) revoked.add(state.current)
      writers.set(owner, { current: writerId, revoked })
    },
    touch(owner: string) { active.add(owner) },
    release(owner: string) { active.delete(owner) },
    version() { return revision },
    put(owner: string, clientKind: Stored['clientKind'], draft: WorkspaceDraftInput) {
      return serial(() => {
        validateScope(draft); validContent(draft)
        const fingerprint = JSON.stringify(['put', draft, clientKind])
        const repeated = replay(owner, draft, fingerprint)
        if (repeated) return structuredClone(repeated.result!)
        return ordered(owner, draft, draft, fingerprint, () => {
          const previous = ownedRecord(owner, draft)
          if (!previous && records.size >= 1000) throw Error('DRAFT_STORAGE_FULL')
          const record: Stored = { ...structuredClone(draft), id: previous?.id ?? `draft:${randomUUID()}`, owner, clientKind, revision: ++revision, updatedAt: Date.now() }
          const prior = previous && structuredClone(previous)
          records.set(record.id, record)
          try { persist() } catch (error) { if (prior) records.set(prior.id, prior); else records.delete(record.id); throw error }
          active.add(owner)
          return project(owner, record)
        })
      })
    },
    remove(owner: string, scope: WorkspaceDraftRemoveInput) {
      return serial(() => {
        const fingerprint = JSON.stringify(['remove', scope])
        if (replay(owner, scope, fingerprint)) return
        ordered(owner, scope, scope, fingerprint, () => {
          const record = ownedRecord(owner, scope)
          if (record) {
            records.delete(record.id); ++revision
            try { persist() } catch (error) { records.set(record.id, record); throw error }
          }
          return undefined
        })
      })
    },
    list(owner: string) { return serial(() => [...records.values()].filter(record => record.libraryIdentity === input.current().identity).map(record => project(owner, record))) },
    recover(owner: string, request: WorkspaceDraftRecoverInput) {
      return serial(() => {
        const fingerprint = JSON.stringify(['recover', request])
        const repeated = replay(owner, request, fingerprint)
        if (repeated) return structuredClone(repeated.result!)
        const record = records.get(request.id), current = input.current()
        if (!record || record.libraryIdentity !== current.identity || !current.generation) throw Error('DRAFT_SCOPE_EXPIRED')
        if (record.owner !== owner && active.has(record.owner)) throw Error('DRAFT_OWNER_ACTIVE')
        if ([...records.values()].some(other => other.id !== record.id && other.owner === owner && sameScope(other, record))) throw Error('DRAFT_LOCAL_CONFLICT')
        return ordered(owner, { ...record, generation: current.generation }, request, fingerprint, () => {
          const previous = structuredClone(record)
          Object.assign(record, { owner, generation: current.generation, writerId: request.writerId, sequence: request.sequence, revision: ++revision })
          try { persist() } catch (error) { records.set(record.id, previous); throw error }
          fencePreviousOwner(owner, previous, current.generation!)
          active.add(owner)
          return project(owner, record)
        })
      })
    },
    discard(owner: string, request: WorkspaceDraftDiscardInput) {
      return serial(() => {
        const fingerprint = JSON.stringify(['discard', request])
        if (replay(owner, request, fingerprint)) return
        const record = records.get(request?.id)
        if (!record || record.libraryIdentity !== input.current().identity || record.revision !== request.revision) throw Error('DRAFT_CHANGED')
        if (record.owner !== owner && active.has(record.owner)) throw Error('DRAFT_OWNER_ACTIVE')
        const current = input.current()
        if (!current.generation) throw Error('DRAFT_SCOPE_EXPIRED')
        ordered(owner, { ...record, generation: current.generation }, request, fingerprint, () => {
          records.delete(record.id); ++revision
          try { persist() } catch (error) { records.set(record.id, record); throw error }
          fencePreviousOwner(owner, record, current.generation!)
          return undefined
        })
      })
    },
    flush: () => queue.then(() => {})
  })
}
