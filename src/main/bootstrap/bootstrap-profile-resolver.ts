import type { DoctorReport } from '../../shared/types/doctor.types'
import type { RuntimeRegistry } from './runtime-registry.types'
import type { BootstrapRecommendation } from './bootstrap.types'
import { resolveRuntimeProfileRecommendation } from '../runtime/runtime-profile-resolver'

export function resolveBootstrapRecommendation(
  doctorReport: DoctorReport,
  registry: RuntimeRegistry
): BootstrapRecommendation {
  const runtimeRecommendation = resolveRuntimeProfileRecommendation({
    platformInfo: {
      platform: registry.platform,
      arch: registry.arch
    },
    doctorReport,
    runtimeRegistry: registry,
    hardwareHints: {
      nvidiaGpu: registry.metadata.nvidiaGpu === true
    }
  })

  const recommendedMode = runtimeRecommendation.recommendedProfileId === 'external-inference-only'
    ? 'external_inference_only'
    : runtimeRecommendation.canUseLocalAi
      ? 'full'
      : 'lightweight'

  return {
    recommendedMode,
    recommendedProfileId: runtimeRecommendation.recommendedProfileId,
    reason: runtimeRecommendation.reason,
    warnings: runtimeRecommendation.warnings,
    blockingIssues: runtimeRecommendation.blockingIssues,
    canContinue: runtimeRecommendation.canContinue,
    canSkip: true
  }
}
