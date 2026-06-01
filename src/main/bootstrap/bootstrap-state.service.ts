import type { BootstrapError, BootstrapEvent, BootstrapMode, BootstrapState, BootstrapTransitionResult } from './bootstrap.types'
import {
  createInitialBootstrapState,
  markBootstrapCompleted,
  markBootstrapFailed,
  markBootstrapSkipped,
  transitionBootstrapState
} from './bootstrap-state-machine'
import type { RuntimeRegistryService } from './runtime-registry.service'

export class BootstrapStateService {
  private state: BootstrapState
  private readonly runtimeRegistryService?: RuntimeRegistryService

  constructor(mode?: BootstrapMode, runtimeRegistryService?: RuntimeRegistryService) {
    this.state = createInitialBootstrapState(mode)
    this.runtimeRegistryService = runtimeRegistryService
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

  async syncRegistry(): Promise<void> {
    if (!this.runtimeRegistryService) return
    await this.runtimeRegistryService.update({
      selectedProfileId: this.state.selectedProfileId,
      recommendedProfileId: this.state.recommendedProfileId,
      warnings: this.state.warnings,
      metadata: {
        bootstrapStatus: this.state.status,
        bootstrapMode: this.state.mode,
        bootstrapStep: this.state.currentStep,
        bootstrapUpdatedAt: this.state.updatedAt
      }
    })
  }
}
