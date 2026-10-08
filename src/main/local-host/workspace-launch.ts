export type WorkspaceLaunchEntry = 'desktop' | 'browser'

export interface WorkspaceLaunchPorts {
  initial: WorkspaceLaunchEntry
  canOpen(): boolean
  showDesktop(): void | Promise<void>
  openBrowser(): Promise<void>
  presentationFailed?(entry: WorkspaceLaunchEntry): void
}

/** Retains cold/early launch intent until the shared Host can present clients. */
export function createWorkspaceLaunch(ports: WorkspaceLaunchPorts) {
  let hostReady = false
  const pending = new Set<WorkspaceLaunchEntry>([ports.initial])
  let tail = Promise.resolve()
  const enqueue = (entry: WorkspaceLaunchEntry): Promise<void> => {
    const operation = tail.catch(() => {}).then(async () => {
      if (!ports.canOpen()) throw Error('HOST_SHUTTING_DOWN')
      try {
        if (entry === 'browser') await ports.openBrowser()
        else await ports.showDesktop()
      } catch (error) {
        try { ports.presentationFailed?.(entry) } catch { /* Retain the original presentation failure. */ }
        throw error
      }
    })
    tail = operation
    return operation
  }
  return {
    request(entry: WorkspaceLaunchEntry): Promise<void> {
      if (!ports.canOpen()) return Promise.reject(Error('HOST_SHUTTING_DOWN'))
      if (!hostReady) { pending.add(entry); return Promise.resolve() }
      return enqueue(entry)
    },
    ready(): Promise<void> {
      if (hostReady) return tail
      hostReady = true
      const entries = [...pending]
      pending.clear()
      return Promise.all(entries.map(enqueue)).then(() => {})
    }
  }
}
