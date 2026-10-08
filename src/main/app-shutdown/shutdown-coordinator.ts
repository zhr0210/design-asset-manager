export type ShutdownState = 'idle' | 'draining' | 'completed' | 'failed'

export interface ShutdownEvent {
  preventDefault(): void
}

export interface ShutdownCoordinatorDependencies {
  drain(): Promise<void>
  requestQuit(): void
}

/** Coordinates one retryable drain without allowing before-quit recursion. */
export class ShutdownCoordinator {
  private currentState: ShutdownState = 'idle'
  private drainPromise: Promise<void> | undefined
  private lastError: unknown

  constructor(private readonly dependencies: ShutdownCoordinatorDependencies) {}

  get state(): ShutdownState { return this.currentState }
  get error(): unknown { return this.lastError }

  handleBeforeQuit(event: ShutdownEvent): void {
    if (this.currentState === 'completed') return
    event.preventDefault()
    if (this.currentState === 'draining') return
    this.currentState = 'draining'
    this.lastError = undefined
    this.drainPromise = this.dependencies.drain()
      .then(() => {
        this.currentState = 'completed'
        this.drainPromise = undefined
        this.dependencies.requestQuit()
      })
      .catch((error: unknown) => {
        this.currentState = 'failed'
        this.lastError = error
        this.drainPromise = undefined
      })
  }
}
