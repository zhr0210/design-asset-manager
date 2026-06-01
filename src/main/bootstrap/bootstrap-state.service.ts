import type { BootstrapError, BootstrapEvent, BootstrapMode, BootstrapState, BootstrapTransitionResult } from './bootstrap.types'
import {
  createInitialBootstrapState,
  markBootstrapCompleted,
  markBootstrapFailed,
  markBootstrapSkipped,
  transitionBootstrapState
} from './bootstrap-state-machine'

export class BootstrapStateService {
  private state: BootstrapState

  constructor(mode?: BootstrapMode) {
    this.state = createInitialBootstrapState(mode)
  }

  getState(): BootstrapState {
    return this.state
  }

  reset(mode?: BootstrapMode): BootstrapState {
    this.state = createInitialBootstrapState(mode ?? this.state.mode)
    return this.state
  }

  dispatch(event: BootstrapEvent): BootstrapTransitionResult {
    const result = transitionBootstrapState(this.state, event)
    if (result.ok) {
      this.state = result.state
    }
    return result
  }

  markFailed(error: BootstrapError): BootstrapState {
    this.state = markBootstrapFailed(this.state, error)
    return this.state
  }

  markSkipped(): BootstrapState {
    this.state = markBootstrapSkipped(this.state)
    return this.state
  }

  markCompleted(): BootstrapState {
    this.state = markBootstrapCompleted(this.state)
    return this.state
  }
}
