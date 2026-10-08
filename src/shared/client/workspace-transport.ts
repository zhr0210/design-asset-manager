/** Compatibility event argument; product subscribers use payloads, never Electron authority. */
export type ClientEvent = unknown

/** Private to the Client factory/adapters. Never exposed as a renderer global. */
export interface WorkspaceTransport {
  invoke(channel: string, ...args: any[]): Promise<any>
  on(channel: string, listener: (...args: any[]) => void): void
  removeListener(channel: string, listener: (...args: any[]) => void): void
  mediaUrl?(reference: string): string
  onReconcile?(listener: () => Promise<void>): () => void
  connectionState?(): { connected: boolean; reconciling: boolean }
}
