import type { DoctorReport } from '../../shared/types/doctor.types'
import { DoctorService } from '../services/doctor'
import { BootstrapStateService } from './bootstrap-state.service'
import type {
  BootstrapCompleteResult,
  BootstrapManagerResult,
  BootstrapRecommendation,
  BootstrapStartCheckResult,
  BootstrapState
} from './bootstrap.types'
import { resolveBootstrapRecommendation } from './bootstrap-profile-resolver'
import { RuntimeRegistryService } from './runtime-registry.service'
import type { RuntimeRegistry } from './runtime-registry.types'

export interface BootstrapManagerOptions {
  stateService?: BootstrapStateService
  doctorService?: Pick<DoctorService, 'runAll'>
  runtimeRegistryService?: RuntimeRegistryService
}

export class BootstrapManager {
  private readonly stateService: BootstrapStateService
  private readonly doctorService: Pick<DoctorService, 'runAll'>
  private readonly runtimeRegistryService: RuntimeRegistryService
  private lastDoctorReport: DoctorReport | null = null
  private lastRecommendation: BootstrapRecommendation | null = null

  constructor(options: BootstrapManagerOptions = {}) {
    this.runtimeRegistryService = options.runtimeRegistryService ?? new RuntimeRegistryService()
    this.stateService = options.stateService ?? new BootstrapStateService('manual', this.runtimeRegistryService)
    this.doctorService = options.doctorService ?? DoctorService.getInstance()
  }

  getState(): BootstrapState {
    return this.stateService.getState()
  }

  async getRegistry(): Promise<RuntimeRegistry> {
    return this.runtimeRegistryService.read()
  }

  async startCheck(): Promise<BootstrapStartCheckResult> {
    let registry = await this.runtimeRegistryService.read()
    this.applyTransition('START_CHECK')

    try {
      const doctorReport = await this.doctorService.runAll()
      this.lastDoctorReport = doctorReport
      registry = await this.runtimeRegistryService.updateDoctorSummary(doctorReport)
      const recommendation = resolveBootstrapRecommendation(doctorReport, registry, registry.profile)
      this.lastRecommendation = recommendation

      this.applyTransition('DOCTOR_COMPLETED', { doctorReport, warnings: recommendation.warnings })
      this.applyTransition('PROFILE_RESOLVED', {
        recommendedProfileId: recommendation.recommendedProfileId,
        warnings: recommendation.blockingIssues
      })
      this.stateService.attachDoctorReport(doctorReport)
      this.stateService.setRecommendation(recommendation)

      registry = await this.runtimeRegistryService.update({
        recommendedProfileId: recommendation.recommendedProfileId,
        warnings: recommendation.warnings,
        metadata: {
          bootstrapRecommendedMode: recommendation.recommendedMode,
          bootstrapRecommendationReason: recommendation.reason,
          bootstrapBlockingIssues: recommendation.blockingIssues
        }
      })

      return {
        state: this.getState(),
        registry,
        doctorReport,
        recommendation
      }
    } catch (error) {
      this.stateService.markFailed({
        code: 'BOOTSTRAP_START_CHECK_FAILED',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true
      })
      throw error
    }
  }

  async resolveRecommendation(): Promise<BootstrapManagerResult> {
    const registry = await this.runtimeRegistryService.read()
    const doctorReport = this.lastDoctorReport ?? this.getState().doctorReport
    if (!doctorReport) {
      throw new Error('Cannot resolve bootstrap recommendation before Doctor has run.')
    }

    const recommendation = resolveBootstrapRecommendation(doctorReport, registry, registry.profile)
    this.lastRecommendation = recommendation
    this.applyTransition('PROFILE_RESOLVED', {
      recommendedProfileId: recommendation.recommendedProfileId,
      warnings: recommendation.blockingIssues
    })
    this.stateService.setRecommendation(recommendation)

    const updated = await this.runtimeRegistryService.update({
      recommendedProfileId: recommendation.recommendedProfileId,
      warnings: recommendation.warnings,
      metadata: {
        bootstrapRecommendedMode: recommendation.recommendedMode,
        bootstrapRecommendationReason: recommendation.reason,
        bootstrapBlockingIssues: recommendation.blockingIssues
      }
    })

    return { state: this.getState(), registry: updated, recommendation }
  }

  async confirmLightweightMode(): Promise<BootstrapManagerResult> {
    return this.confirmMode('lightweight')
  }

  async confirmExternalInferenceOnlyMode(): Promise<BootstrapManagerResult> {
    return this.confirmMode('external_inference_only')
  }

  async skipBootstrap(): Promise<BootstrapManagerResult> {
    const result = this.stateService.dispatch({ type: 'SKIP' })
    if (!result.ok) throw new Error(result.error?.message ?? 'Cannot skip bootstrap from current state.')
    const registry = await this.runtimeRegistryService.update({
      initialized: false,
      metadata: {
        bootstrapStatus: 'skipped',
        bootstrapSkippedAt: this.getState().updatedAt
      }
    })
    return { state: this.getState(), registry, recommendation: this.lastRecommendation }
  }

  async retryBootstrap(): Promise<BootstrapManagerResult> {
    const result = this.stateService.dispatch({ type: 'RETRY' })
    if (!result.ok) throw new Error(result.error?.message ?? 'Cannot retry bootstrap from current state.')
    return { state: this.getState(), registry: await this.runtimeRegistryService.read(), recommendation: this.lastRecommendation }
  }

  async resetBootstrap(): Promise<BootstrapManagerResult> {
    this.stateService.reset()
    this.lastDoctorReport = null
    this.lastRecommendation = null
    return { state: this.getState(), registry: await this.runtimeRegistryService.read(), recommendation: null }
  }

  async completeBootstrapWithoutInstall(): Promise<BootstrapCompleteResult> {
    const state = this.getState()
    if (!['recommendation_ready', 'installing', 'verifying'].includes(state.status)) {
      throw new Error(`Cannot complete bootstrap from ${state.status}.`)
    }

    const profileId = state.selectedProfileId ?? state.recommendedProfileId
    if (!profileId) {
      throw new Error('Cannot complete bootstrap without a selected or recommended profile.')
    }

    if (state.status === 'recommendation_ready') {
      this.applyTransition('USER_CONFIRMED', { selectedProfileId: profileId })
    }
    if (this.getState().status === 'installing') {
      this.applyTransition('INSTALL_COMPLETED')
    }
    if (this.getState().status === 'verifying') {
      this.applyTransition('VERIFY_COMPLETED')
    }

    const registry = await this.runtimeRegistryService.markInitialized(profileId)
    return {
      state: this.getState(),
      registry,
      recommendation: this.lastRecommendation,
      completed: true
    }
  }

  private async confirmMode(profileId: 'lightweight' | 'external_inference_only'): Promise<BootstrapManagerResult> {
    this.applyTransition('USER_CONFIRMED', { selectedProfileId: profileId })
    this.stateService.setSelectedProfile(profileId)
    const registry = await this.runtimeRegistryService.update({
      selectedProfileId: profileId,
      metadata: {
        bootstrapSelectedMode: profileId
      }
    })
    return { state: this.getState(), registry, recommendation: this.lastRecommendation }
  }

  private applyTransition(type: Parameters<BootstrapStateService['dispatch']>[0]['type'], payload: Record<string, unknown> = {}) {
    const result = this.stateService.dispatch({ type, ...payload } as Parameters<BootstrapStateService['dispatch']>[0])
    if (!result.ok) throw new Error(result.error?.message ?? `Bootstrap transition ${type} failed.`)
  }
}
