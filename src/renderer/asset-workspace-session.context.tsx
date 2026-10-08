import { createContext, useContext } from 'react'
import type { AssetWorkspaceSession } from './asset-workspace-session.internal'

export const AssetWorkspaceSessionContext = createContext<AssetWorkspaceSession | null>(null)
export function useAssetWorkspaceSession() {
  const session = useContext(AssetWorkspaceSessionContext)
  if (!session) throw Error('ASSET_WORKSPACE_SESSION_UNAVAILABLE')
  return session
}
