/** Local scheduling dependency; cancellation still uses the controller's AbortSignal. */
export interface VisualAiClock {
  now(): number
  scheduleTimeout(callback: () => void, delayMs: number): () => void
}

export const systemVisualAiClock: VisualAiClock = {
  now: () => Date.now(),
  scheduleTimeout(callback, delayMs) {
    const timer = setTimeout(callback, delayMs)
    return () => clearTimeout(timer)
  }
}
