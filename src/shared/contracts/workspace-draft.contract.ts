export type WorkspaceDraftKind = 'description' | 'prompt' | 'notebook' | 'ocr' | 'work-set' | 'work-media'
export interface WorkspaceDraftScope { libraryIdentity: string; generation: string; kind: WorkspaceDraftKind; entityId: string }
/** One document writer uses a strictly increasing counter across its mutations. */
export interface WorkspaceDraftOrder { writerId: string; sequence: number }
export interface WorkspaceDraftInput extends WorkspaceDraftScope, WorkspaceDraftOrder { value: unknown; base: unknown }
export interface WorkspaceDraftRemoveInput extends WorkspaceDraftScope, WorkspaceDraftOrder {}
export interface WorkspaceDraftRecoverInput extends WorkspaceDraftOrder { id: string }
export interface WorkspaceDraftDiscardInput extends WorkspaceDraftRecoverInput { revision: number }
export interface WorkspaceDraftRecord extends WorkspaceDraftScope {
  value: unknown
  base: unknown
  /** Optional only when reading an existing v1 recovery record. New mutations require order. */
  writerId?: string
  sequence?: number
  id: string
  revision: number
  updatedAt: number
  clientKind: 'desktop' | 'browser' | 'native'
  owned: boolean
  activeElsewhere: boolean
}
export interface WorkspaceDraftApi {
  put(input: WorkspaceDraftInput): Promise<WorkspaceDraftRecord>
  remove(scope: WorkspaceDraftRemoveInput): Promise<void>
  list(): Promise<WorkspaceDraftRecord[]>
  recover(input: WorkspaceDraftRecoverInput): Promise<WorkspaceDraftRecord>
  discard(input: WorkspaceDraftDiscardInput): Promise<void>
}
export interface NativeDraftBridge extends Pick<WorkspaceDraftApi, 'put' | 'remove'> {
  ready(input: { draftWriterId: string }): Promise<void>
  acknowledge(request: { id: string; ok: boolean; transient: boolean }): Promise<void>
  onFlush(listener: (request: { id: string; freeze: boolean }) => void): () => void
  onState(listener: (state: { frozen: boolean }) => void): () => void
}
