import type { ActiveLibraryHost } from '../shared/contracts/active-library.contract'

type Release = () => void
type Completion = void | Promise<unknown>
type LibraryScope = { libraryIdentity: string; generation: string }
type Drainable = { suspendAndDrain(): Completion }
type ResumableDrainable = Drainable & { resume(): void }

/** Existing owners retain their job, process, storage and permission state. */
export interface LibraryQuiescenceParticipants {
  visualAdmission?: { hold(): Release }
  activeLibraryHost?: Pick<ActiveLibraryHost, 'inspect' | 'readVisualSession' | 'holdBusinessAdmission' | 'close'> & Partial<Pick<ActiveLibraryHost,'suspendRetrievalWork'>>
  workWindows?: { drain(): Completion }
  managedDownloads?: { drain(): Completion }
  assetCard?: { invalidate(): void }
  tagDecisions?: { invalidate(): void }
  tagBatches?: ResumableDrainable & { invalidate(): void }
  tagRecovery?: { invalidate(): void; flush(scope: LibraryScope): Completion }
  visualAi?: ResumableDrainable
  tagExecution?: ResumableDrainable
  tagIntents?: { invalidate(): void }
  imageTools?: { invalidate(): void }
  backgroundAnalysis?: ResumableDrainable & { invalidate(): void }
  basicAnalysis?:ResumableDrainable & {invalidate():void}
  backgroundOcr?: Drainable & { invalidate(): void }
  ocr?: ResumableDrainable & { suspend(): void }
  aiConnections?: {
    suspend(): void
    suspendAll(): void
    drainInference(): Completion
    drain(): Completion
    resume(): void
  }
  aiAcceptance?: { drain(): Completion; resume(): void }
  managedVision?: {drain():Completion}
  retrievalRuntime?: ResumableDrainable
  queryFileGrants?:{clear():void}
}

export interface LibraryQuiescenceDependencies {
  current(): LibraryQuiescenceParticipants
  isShutdownIdle(): boolean
  confirmSwitchDraftDiscard(): void
}

/**
 * Main's existing Library-Bound Work choreography. IPC owns serialized
 * before/operation/finally-after cycles; each owner still proves its own drain.
 * A fulfilled Library drain is not a new guarantee of physical process exit.
 */
export function createLibraryQuiescence(dependencies: LibraryQuiescenceDependencies) {
  const current = dependencies.current
  let authorityBarrierRelease: Release | undefined
  let authorityBusinessRelease: Release | undefined

  const suspendOwners = (shutdown: boolean) => {
    current().activeLibraryHost?.suspendRetrievalWork?.()
    current().queryFileGrants?.clear()
    current().tagDecisions?.invalidate()
    current().tagBatches?.invalidate()
    current().tagRecovery?.invalidate()
    if (shutdown) current().aiConnections?.suspendAll()
    else current().aiConnections?.suspend()
    current().backgroundOcr?.invalidate()
    current().backgroundAnalysis?.invalidate()
    current().basicAnalysis?.invalidate()
    current().ocr?.suspend()
  }

  // Preserve fail-fast Promise.all and the order in which owners start.
  const drainOwners = (shutdown: boolean) => Promise.all([
    current().backgroundAnalysis?.suspendAndDrain(),
    current().basicAnalysis?.suspendAndDrain(),
    current().tagBatches?.suspendAndDrain(),
    current().visualAi?.suspendAndDrain(),
    current().tagExecution?.suspendAndDrain(),
    current().ocr?.suspendAndDrain(),
    current().backgroundOcr?.suspendAndDrain(),
    current().managedVision?.drain(),
    current().retrievalRuntime?.suspendAndDrain(),
    shutdown ? current().aiConnections?.drain() : current().aiConnections?.drainInference(),
    current().aiAcceptance?.drain()
  ])

  const invalidateIntents = () => {
    current().tagIntents?.invalidate()
    current().imageTools?.invalidate()
  }

  const resumeApplicationWork = () => {
    current().aiConnections?.resume()
    current().aiAcceptance?.resume()
    current().retrievalRuntime?.resume()
  }

  return {
    async onAuthorityWillChange(): Promise<void> {
      dependencies.confirmSwitchDraftDiscard()
      authorityBarrierRelease = current().visualAdmission?.hold()
      suspendOwners(false)
      await current().workWindows?.drain()
      await current().managedDownloads?.drain()
      authorityBusinessRelease = current().activeLibraryHost!.holdBusinessAdmission()
      await drainOwners(false)
      invalidateIntents()
      current().assetCard?.invalidate()
    },

    async onAuthorityDidChange(): Promise<void> {
      const release = authorityBarrierRelease
      const businessRelease = authorityBusinessRelease
      authorityBarrierRelease = undefined
      authorityBusinessRelease = undefined
      if (!release) {
        businessRelease?.()
        return
      }
      let ready: LibraryScope | undefined
      try {
        const scope = current().activeLibraryHost!.inspect()
        if (scope.state === 'ready' && scope.identity && scope.generation) {
          ready = { libraryIdentity: scope.identity, generation: scope.generation }
          await current().activeLibraryHost!.readVisualSession(ready)
          current().visualAi?.resume()
          current().tagExecution?.resume()
          current().tagBatches?.resume()
          current().basicAnalysis?.resume()
          current().backgroundAnalysis?.resume()
          if (dependencies.isShutdownIdle()) {
            current().ocr?.resume()
            resumeApplicationWork()
          }
        } else if (dependencies.isShutdownIdle()) {
          // Environment selection is app-scoped; recognition still checks its Library scope.
          // OCR's own resume guard keeps pending drains/processes suspended.
          current().ocr?.resume()
        }
      } finally {
        businessRelease?.()
        release()
        if (dependencies.isShutdownIdle()) resumeApplicationWork()
      }
      if (ready) {
        try { await current().tagRecovery?.flush(ready) }
        catch { /* Reopening stays usable; a later refresh can redeliver. */ }
      }
    },

    async drainForShutdown(): Promise<void> {
      // Exit holds are independent of authority-cycle holds and never resumed.
      current().visualAdmission?.hold()
      suspendOwners(true)
      await current().workWindows?.drain()
      await current().managedDownloads?.drain()
      current().assetCard?.invalidate()
      current().activeLibraryHost?.holdBusinessAdmission()
      await drainOwners(true)
      invalidateIntents()
      await current().activeLibraryHost?.close()
    }
  }
}

export type LibraryQuiescence = ReturnType<typeof createLibraryQuiescence>
