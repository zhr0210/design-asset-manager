import type { DoctorReport } from './doctor.types'
import type { RuntimeRegistry } from './runtime-registry.types'
import type { RuntimeProfileId } from './runtime-profile.types'

export type BootstrapStatus =
  | 'not_initialized'
  | 'checking'
  | 'recommendation_ready'
  | 'installing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'skipped'

export type BootstrapMode = 'full' | 'lightweight' | 'external_inference_only' | 'manual'

export type BootstrapStep =
  | 'read_registry'
  | 'run_doctor'
  | 'resolve_profile'
  | 'wait_user_confirm'
  | 'install_runtime'
  | 'verify_runtime'
  | 'write_registry'
  | 'completed'

export interface BootstrapError {
  code: string
  message: string
  details?: Record<string, unknown>
  recoverable: boolean
}

export interface BootstrapRecommendation {
  recommendedMode: BootstrapMode
  recommendedProfileId: RuntimeProfileId
  reason: string
  warnings: string[]
  blockingIssues: string[]
  canContinue: boolean
  canSkip: boolean
}

export interface BootstrapState {
  status: BootstrapStatus
  mode: BootstrapMode
  currentStep: BootstrapStep | null
  startedAt: string | null
  updatedAt: string
  completedAt: string | null
  error: BootstrapError | null
  doctorReport: DoctorReport | null
  recommendation: BootstrapRecommendation | null
  selectedProfileId: RuntimeProfileId | null
  recommendedProfileId: RuntimeProfileId | null
  warnings: string[]
  canContinue: boolean
  canSkip: boolean
  canRetry: boolean
}

export type BootstrapEvent =
  | { type: 'START_CHECK'; mode?: BootstrapMode; at?: string }
  | { type: 'DOCTOR_COMPLETED'; doctorReport: DoctorReport; warnings?: string[]; at?: string }
  | { type: 'PROFILE_RESOLVED'; recommendedProfileId: RuntimeProfileId; selectedProfileId?: RuntimeProfileId; warnings?: string[]; at?: string }
  | { type: 'USER_CONFIRMED'; selectedProfileId?: RuntimeProfileId; at?: string }
  | { type: 'INSTALL_STARTED'; at?: string }
  | { type: 'INSTALL_COMPLETED'; at?: string }
  | { type: 'VERIFY_COMPLETED'; warnings?: string[]; at?: string }
  | { type: 'COMPLETE'; warnings?: string[]; at?: string }
  | { type: 'FAIL'; error: BootstrapError; at?: string }
  | { type: 'SKIP'; at?: string }
  | { type: 'RETRY'; at?: string }
  | { type: 'RESET'; at?: string }

export interface BootstrapTransitionResult {
  ok: boolean
  state: BootstrapState
  error?: BootstrapError
}

export interface BootstrapManagerResult {
  state: BootstrapState
  registry: RuntimeRegistry
  recommendation?: BootstrapRecommendation | null
}

export interface BootstrapStartCheckResult extends BootstrapManagerResult {
  doctorReport: DoctorReport
  recommendation: BootstrapRecommendation
}

export interface BootstrapCompleteResult extends BootstrapManagerResult {
  completed: boolean
}
