export const LEGACY_MODEL_MUTATION_BLOCKED_ERROR = 'LEGACY_MODEL_MUTATION_BLOCKED'
export const NO_ACTIVE_LEGACY_MODEL_TRANSFER_ERROR = 'NO_ACTIVE_LEGACY_MODEL_TRANSFER'

export interface LegacyModelMutationBlockedResult {
  success: false
  error: typeof LEGACY_MODEL_MUTATION_BLOCKED_ERROR
}

export interface NoActiveLegacyModelTransferResult {
  success: false
  error: typeof NO_ACTIVE_LEGACY_MODEL_TRANSFER_ERROR
}

/**
 * Fail closed for legacy model acquisition, compatibility repair, and direct
 * deletion. Read-only evidence and cancellation stay with their existing IPC.
 */
export function blockLegacyModelMutation(): LegacyModelMutationBlockedResult {
  return {
    success: false,
    error: LEGACY_MODEL_MUTATION_BLOCKED_ERROR
  }
}

/**
 * Cancellation channels stay callable for bridge compatibility, but a process
 * restarted into containment cannot own a downloader started by older code.
 */
export function noActiveLegacyModelTransfer(): NoActiveLegacyModelTransferResult {
  return {
    success: false,
    error: NO_ACTIVE_LEGACY_MODEL_TRANSFER_ERROR
  }
}
