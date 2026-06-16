import type { ReleasePlatform } from './release-flow-governance'

export type ReleaseDistributionInstallSmoke =
  | 'windows_sandbox_installer_smoke'
  | 'macos_dmg_install_smoke'

export type ReleaseInstallSmokeCheckId =
  | 'installer-run'
  | 'installer-subfolder'
  | 'installed-exe'
  | 'dmg-mount'
  | 'dmg-copy'
  | 'dmg-installed-launch'
  | 'dmg-detach'

export interface ReleaseInstallSmokePreflight {
  platform: ReleasePlatform
  distributionSmoke: ReleaseDistributionInstallSmoke
  evidenceSource: 'package-smoke'
  packageSmokeCommand:
    | 'node scripts/package-smoke.mjs --sandbox-install --output=dist-packages/package-smoke-windows-${arch}.json'
    | 'node scripts/package-smoke.mjs --dmg-install-smoke --output=dist-packages/package-smoke-macos-${arch}.json'
  requiredCheckIds: ReleaseInstallSmokeCheckId[]
  executionHost: 'windows-sandbox' | 'macos-host'
  disposableInstallRoot: true
  launchUsesIsolatedAppData: true
  writesLocalPaths: false
  readsSigningSecrets: false
}

export function createReleaseInstallSmokePreflight(
  platform: ReleasePlatform
): ReleaseInstallSmokePreflight {
  if (platform === 'windows') {
    return {
      platform,
      distributionSmoke: 'windows_sandbox_installer_smoke',
      evidenceSource: 'package-smoke',
      packageSmokeCommand: 'node scripts/package-smoke.mjs --sandbox-install --output=dist-packages/package-smoke-windows-${arch}.json',
      requiredCheckIds: ['installer-run', 'installer-subfolder', 'installed-exe'],
      executionHost: 'windows-sandbox',
      disposableInstallRoot: true,
      launchUsesIsolatedAppData: true,
      writesLocalPaths: false,
      readsSigningSecrets: false
    }
  }

  return {
    platform,
    distributionSmoke: 'macos_dmg_install_smoke',
    evidenceSource: 'package-smoke',
    packageSmokeCommand: 'node scripts/package-smoke.mjs --dmg-install-smoke --output=dist-packages/package-smoke-macos-${arch}.json',
    requiredCheckIds: ['dmg-mount', 'dmg-copy', 'dmg-installed-launch', 'dmg-detach'],
    executionHost: 'macos-host',
    disposableInstallRoot: true,
    launchUsesIsolatedAppData: true,
    writesLocalPaths: false,
    readsSigningSecrets: false
  }
}
