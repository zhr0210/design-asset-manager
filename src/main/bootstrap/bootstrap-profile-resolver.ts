import type { DoctorReport } from '../../shared/types/doctor.types'
import type { RuntimeRegistry } from './runtime-registry.types'
import type { BootstrapPackagePlan, BootstrapRecommendation } from './bootstrap.types'
import { resolveRuntimeProfileRecommendation } from '../runtime/runtime-profile-resolver'
import type { RuntimePackageManifest } from '../../shared/types/runtime-package.types'
import { resolveBootstrapPackagePlan } from './bootstrap-package-plan-resolver'

export function resolveBootstrapRecommendation(
  doctorReport: DoctorReport,
  registry: RuntimeRegistry,
  manifest?: RuntimePackageManifest
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
  const packagePlan: BootstrapPackagePlan | null = manifest
    ? resolveBootstrapPackagePlan({
      manifest,
      recommendation: runtimeRecommendation,
      platform: registry.platform,
      arch: registry.arch,
      capabilities: []
    })
    : null

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
    blockingIssues: [...runtimeRecommendation.blockingIssues, ...(packagePlan?.blockingIssues ?? [])],
    packagePlan,
    packageWarnings: packagePlan?.warnings ?? [],
    packageBlockingIssues: packagePlan?.blockingIssues ?? [],
    canContinue: runtimeRecommendation.canContinue && (packagePlan?.blockingIssues.length ?? 0) === 0,
    canSkip: true
  }
}
