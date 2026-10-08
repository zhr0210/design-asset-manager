/** A transport failure must not erase input that has not reached the Host. */
export class WorkspaceConnectionError extends Error {
  readonly preserveDrafts = true
}

/** Transport messages are fixed product text; ordinary errors keep each caller's safe fallback. */
export function workspaceMutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof WorkspaceConnectionError ? error.message : fallback
}
