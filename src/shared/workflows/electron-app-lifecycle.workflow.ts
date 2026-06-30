import { platformAdapterMatchesCurrentPlatform } from './platform-adapter-selection.workflow'

export type ElectronAppLifecyclePlatform = 'win32' | 'darwin' | 'default'

export interface ElectronAppLifecyclePolicy {
  platform: ElectronAppLifecyclePlatform
  appUserModelId?: string
  quitOnAllWindowsClosed: boolean
}

export const ELECTRON_APP_LIFECYCLE_POLICIES: readonly ElectronAppLifecyclePolicy[] = [
  {
    platform: 'win32',
    appUserModelId: 'com.antigravity.designassetmanager',
    quitOnAllWindowsClosed: true
  },
  {
    platform: 'darwin',
    quitOnAllWindowsClosed: false
  },
  {
    platform: 'default',
    quitOnAllWindowsClosed: true
  }
] as const

export function resolveElectronAppLifecyclePolicy(platform: string): ElectronAppLifecyclePolicy {
  return ELECTRON_APP_LIFECYCLE_POLICIES.find((policy) =>
    platformAdapterMatchesCurrentPlatform(policy, { currentPlatform: platform })
  )
    ?? ELECTRON_APP_LIFECYCLE_POLICIES.find((policy) =>
      platformAdapterMatchesCurrentPlatform(policy, { currentPlatform: 'default' })
    )!
}
