import { listReleasePlatformTargets, type ReleasePlatform } from './release-flow-governance'

export type ReleaseBrandingPlatform = ReleasePlatform

export type ReleaseBrandingEvidenceCheck =
  | 'branding_approval'
  | 'platform_icon_container'
  | 'approved_digest'

export interface ReleaseBrandingPlatformRequirement {
  platform: ReleaseBrandingPlatform
  iconFileName: 'icon.ico' | 'icon.icns'
  iconFormat: 'ico' | 'icns'
  outputEvidencePrefix: 'release-branding-evidence'
}

export interface ReleaseBrandingPreflight {
  schemaVersion: 1
  approvalFileName: 'release-branding.json'
  approvalSchemaVersion: 1
  requiredApprovalFields: string[]
  platforms: ReleaseBrandingPlatformRequirement[]
  requiredChecks: ReleaseBrandingEvidenceCheck[]
  defaultElectronIconAllowed: false
  emitsIconDigest: false
  readsIconPixels: false
}

export function createReleaseBrandingPreflight(): ReleaseBrandingPreflight {
  return {
    schemaVersion: 1,
    approvalFileName: 'release-branding.json',
    approvalSchemaVersion: 1,
    requiredApprovalFields: [
      'approvalId',
      'approvedAt',
      'icons.windows.file',
      'icons.windows.sha256',
      'icons.macos.file',
      'icons.macos.sha256'
    ],
    platforms: [
      ...listReleasePlatformTargets().map((target) => ({
        platform: target.platform,
        iconFileName: target.brandingIconFileName,
        iconFormat: target.brandingIconFileName === 'icon.ico' ? 'ico' as const : 'icns' as const,
        outputEvidencePrefix: 'release-branding-evidence' as const
      }))
    ],
    requiredChecks: [
      'branding_approval',
      'platform_icon_container',
      'approved_digest'
    ],
    defaultElectronIconAllowed: false,
    emitsIconDigest: false,
    readsIconPixels: false
  }
}
