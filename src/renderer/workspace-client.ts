import type { WorkspaceClient } from '../shared/client/workspace-client'

let installed: WorkspaceClient | undefined

/** Run before importing App/Stores; no module caches an absent desktop bridge. */
export function installWorkspaceClient(client: WorkspaceClient): void {
  if (installed && installed !== client) throw new Error('WORKSPACE_CLIENT_ALREADY_INSTALLED')
  installed = client
}

export function getWorkspaceClient(): WorkspaceClient | undefined {
  if (installed) return installed
  if (typeof window === 'undefined') return undefined
  return (window as Window & { damClient?: WorkspaceClient }).damClient
}

export function workspaceMediaUrl(reference: string): string {
  return getWorkspaceClient()?.mediaUrl?.(reference) ?? reference
}
export function requireWorkspaceClient(): WorkspaceClient {
  const client = getWorkspaceClient()
  if (!client) throw Error('本机 DAM 尚未连接。')
  return client
}
