import type { DoctorReport } from '../../shared/types/doctor.types'
import type { PlatformProfile } from '../../shared/types/platform.types'
import type { RuntimeRegistry } from './runtime-registry.types'
import type { BootstrapRecommendation } from './bootstrap.types'

const BLOCKING_CHECK_IDS = new Set(['path', 'permission', 'system', 'node'])

function hasCheck(report: DoctorReport, id: string, status: 'warning' | 'error') {
  return report.checks.some((check) => check.id === id && check.status === status)
}

export function resolveBootstrapRecommendation(
  doctorReport: DoctorReport,
  registry: RuntimeRegistry,
  platformProfile: PlatformProfile = registry.profile
): BootstrapRecommendation {
  const warnings = doctorReport.checks
    .filter((check) => check.status === 'warning')
    .map((check) => `${check.label}: ${check.message}`)

  const blockingIssues = doctorReport.checks
    .filter((check) => check.status === 'error' && BLOCKING_CHECK_IDS.has(check.id))
    .map((check) => `${check.label}: ${check.message}`)

  if (hasCheck(doctorReport, 'native-deps', 'error')) {
    warnings.push('Native dependencies need attention before local runtime features are reliable.')
  }

  if (blockingIssues.length > 0) {
    return {
      recommendedMode: 'manual',
      recommendedProfileId: 'manual',
      reason: `Critical system or path checks must be resolved before bootstrap can continue on ${platformProfile}.`,
      warnings,
      blockingIssues,
      canContinue: false,
      canSkip: true
    }
  }

  if (hasCheck(doctorReport, 'python', 'warning') || hasCheck(doctorReport, 'native-deps', 'warning')) {
    return {
      recommendedMode: 'external_inference_only',
      recommendedProfileId: 'external_inference_only',
      reason: 'Local AI prerequisites are incomplete, so external inference only is the safest current mode.',
      warnings,
      blockingIssues,
      canContinue: true,
      canSkip: true
    }
  }

  if (hasCheck(doctorReport, 'ai-worker', 'warning') || hasCheck(doctorReport, 'port', 'warning')) {
    return {
      recommendedMode: 'lightweight',
      recommendedProfileId: 'lightweight',
      reason: 'System basics are available while AI Worker is not reachable, so lightweight mode is recommended.',
      warnings,
      blockingIssues,
      canContinue: true,
      canSkip: true
    }
  }

  return {
    recommendedMode: 'full',
    recommendedProfileId: 'full',
    reason: 'Doctor checks do not report blocking issues, so the full mode can be considered later.',
    warnings,
    blockingIssues,
    canContinue: true,
    canSkip: true
  }
}
