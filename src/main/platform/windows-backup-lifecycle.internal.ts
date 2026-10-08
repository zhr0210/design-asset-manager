import { reserveWindowsBackupMemory } from './windows-backup-resource.internal'

/** Resource release requires a later physical-close fact, never cancellation. */
export class WindowsBackupPhysicalExitUnconfirmedError extends Error {
  constructor(readonly released: Promise<void>, reason = 'BACKUP_PHYSICAL_EXIT_UNCONFIRMED') {super(reason)}
}

/** Private qualification seam. runTarget must settle only on actual child close. */
export async function prepareWindowsBackupLifecycle(input: Parameters<typeof reserveWindowsBackupMemory>[0] & {
  createImage(): Buffer | Promise<Buffer>
  verifyImage(image: Buffer, nativeReadbackSha256: string): void
  runTarget(image: Buffer, whileHeld: (sha256: string) => Promise<number>): Promise<void>
}): Promise<{ checkHeld(): void; finish(committed: boolean): Promise<void> }> {
  const resource = reserveWindowsBackupMemory(input)
  let readyResolve!: () => void, readyReject!: (error: unknown) => void
  const ready = new Promise<void>((resolve, reject) => { readyResolve = resolve; readyReject = reject })
  let decide!: (byte: number) => void
  const decision = new Promise<number>(resolve => { decide = resolve })
  let completion: Promise<void>, image: Buffer | undefined, finished: Promise<void> | undefined, closed = false
  let unknownRelease: Promise<void> | undefined
  const release = () => {closed = true; resource.release()}
  const releaseAfterExit = () => {
    if (unknownRelease) void unknownRelease.then(release, () => {/* Unknown remains charged. */})
    else release()
  }
  try {
    input.signal.throwIfAborted()
    image = await input.createImage()
    input.signal.throwIfAborted()
    if (!Buffer.isBuffer(image) || image.length !== input.imageBytes) throw Error('BACKUP_IMAGE_CHANGED')
    completion = input.runTarget(image, async sha256 => {
      input.signal.throwIfAborted()
      input.verifyImage(image!, sha256)
      readyResolve()
      return decision
    }).then(() => { readyReject(Error('BACKUP_TARGET_CLOSED_BEFORE_READY')) }, error => {
      if (error instanceof WindowsBackupPhysicalExitUnconfirmedError) unknownRelease = error.released
      readyReject(error)
      throw error
    }).finally(() => {
      image = undefined
      releaseAfterExit()
    })
    // A failed preparation still waits for the authoritative close receipt.
    void completion.catch(() => {})
  } catch (error) {
    if (error instanceof WindowsBackupPhysicalExitUnconfirmedError) unknownRelease = error.released
    releaseAfterExit()
    throw error
  }
  const finish = (committed: boolean) => finished ??= (decide(committed ? 1 : 0), completion.catch(error => {
    // An acknowledged physical close settles a cancellation. A different
    // failure or an UNKNOWN close still rejects and retains its reservation.
    if (!committed && closed && !unknownRelease && input.signal.aborted && error === input.signal.reason) return
    throw error
  }))
  const checkHeld = () => { input.signal.throwIfAborted(); if (closed || finished) throw Error('BACKUP_TARGET_NOT_HELD') }
  try { await ready; checkHeld(); return { checkHeld, finish } }
  catch (error) { await finish(false).catch(() => {}); throw error }
}
