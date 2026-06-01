import type { BootstrapError, BootstrapEvent, BootstrapMode, BootstrapState, BootstrapTransitionResult } from './bootstrap.types'

const DEFAULT_MODE: BootstrapMode = 'manual'

const allowedEventsByStatus: Record<BootstrapState['status'], BootstrapEvent['type'][]> = {
  not_initialized: ['START_CHECK', 'SKIP', 'RESET'],
  checking: ['DOCTOR_COMPLETED', 'FAIL', 'SKIP', 'RESET'],
  recommendation_ready: ['PROFILE_RESOLVED', 'USER_CONFIRMED', 'FAIL', 'SKIP', 'RESET'],
  installing: ['INSTALL_STARTED', 'INSTALL_COMPLETED', 'FAIL', 'SKIP', 'RESET'],
  verifying: ['VERIFY_COMPLETED', 'COMPLETE', 'FAIL', 'SKIP', 'RESET'],
  completed: ['RESET'],
  failed: ['RETRY', 'RESET'],
  skipped: ['RESET']
}

function now() {
  return new Date().toISOString()
}

function withFlags(state: Omit<BootstrapState, 'canContinue' | 'canSkip' | 'canRetry'>): BootstrapState {
  return {
    ...state,
    canContinue: state.status === 'recommendation_ready',
    canSkip: !['completed', 'skipped'].includes(state.status),
    canRetry: state.status === 'failed'
  }
}

function transitionError(message: string): BootstrapError {
  return {
    code: 'BOOTSTRAP_INVALID_TRANSITION',
    message,
    recoverable: true
  }
}

function appendWarnings(state: BootstrapState, warnings?: string[]) {
  return warnings?.length ? [...state.warnings, ...warnings] : state.warnings
}

export function createInitialBootstrapState(mode: BootstrapMode = DEFAULT_MODE, at = now()): BootstrapState {
  return withFlags({
    status: 'not_initialized',
    mode,
    currentStep: null,
    startedAt: null,
    updatedAt: at,
    completedAt: null,
    error: null,
    doctorReport: null,
    recommendation: null,
    selectedProfileId: null,
    recommendedProfileId: null,
    warnings: []
  })
}

export function getNextAllowedEvents(state: BootstrapState): BootstrapEvent['type'][] {
  return [...allowedEventsByStatus[state.status]]
}

export function canTransition(state: BootstrapState, event: BootstrapEvent): boolean {
  return allowedEventsByStatus[state.status].includes(event.type)
}

export function transitionBootstrapState(state: BootstrapState, event: BootstrapEvent): BootstrapTransitionResult {
  if (!canTransition(state, event)) {
    const error = transitionError(`Cannot apply ${event.type} while bootstrap status is ${state.status}.`)
    return { ok: false, state, error }
  }

  const at = event.at ?? now()

  switch (event.type) {
    case 'START_CHECK':
    case 'RETRY':
      return {
        ok: true,
        state: withFlags({
          ...state,
          status: 'checking',
          mode: event.type === 'START_CHECK' ? event.mode ?? state.mode : state.mode,
          currentStep: 'run_doctor',
          startedAt: state.startedAt ?? at,
          updatedAt: at,
          completedAt: null,
          error: null
        })
      }
    case 'DOCTOR_COMPLETED':
      return {
        ok: true,
        state: withFlags({
          ...state,
          status: 'recommendation_ready',
          currentStep: 'resolve_profile',
          updatedAt: at,
          error: null,
          doctorReport: event.doctorReport,
          warnings: appendWarnings(state, event.warnings)
        })
      }
    case 'PROFILE_RESOLVED':
      return {
        ok: true,
        state: withFlags({
          ...state,
          status: 'recommendation_ready',
          currentStep: 'wait_user_confirm',
          updatedAt: at,
          error: null,
          recommendedProfileId: event.recommendedProfileId,
          selectedProfileId: event.selectedProfileId ?? event.recommendedProfileId,
          warnings: appendWarnings(state, event.warnings)
        })
      }
    case 'USER_CONFIRMED':
    case 'INSTALL_STARTED':
      return {
        ok: true,
        state: withFlags({
          ...state,
          status: 'installing',
          currentStep: 'install_runtime',
          updatedAt: at,
          error: null,
          selectedProfileId: event.type === 'USER_CONFIRMED' ? event.selectedProfileId ?? state.selectedProfileId : state.selectedProfileId
        })
      }
    case 'INSTALL_COMPLETED':
      return {
        ok: true,
        state: withFlags({
          ...state,
          status: 'verifying',
          currentStep: 'verify_runtime',
          updatedAt: at,
          error: null
        })
      }
    case 'VERIFY_COMPLETED':
    case 'COMPLETE':
      return {
        ok: true,
        state: withFlags({
          ...state,
          status: 'completed',
          currentStep: 'completed',
          updatedAt: at,
          completedAt: at,
          error: null,
          warnings: appendWarnings(state, event.warnings)
        })
      }
    case 'FAIL':
      return {
        ok: true,
        state: markBootstrapFailed(state, event.error, at)
      }
    case 'SKIP':
      return {
        ok: true,
        state: markBootstrapSkipped(state, at)
      }
    case 'RESET':
      return {
        ok: true,
        state: createInitialBootstrapState(state.mode, at)
      }
  }
}

export function markBootstrapFailed(state: BootstrapState, error: BootstrapError, at = now()): BootstrapState {
  return withFlags({
    ...state,
    status: 'failed',
    currentStep: state.currentStep,
    updatedAt: at,
    completedAt: null,
    error
  })
}

export function markBootstrapSkipped(state: BootstrapState, at = now()): BootstrapState {
  return withFlags({
    ...state,
    status: 'skipped',
    currentStep: null,
    updatedAt: at,
    completedAt: at,
    error: null
  })
}

export function markBootstrapCompleted(state: BootstrapState, at = now()): BootstrapState {
  return withFlags({
    ...state,
    status: 'completed',
    currentStep: 'completed',
    updatedAt: at,
    completedAt: at,
    error: null
  })
}
