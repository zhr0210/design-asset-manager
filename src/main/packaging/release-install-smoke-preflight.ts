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

const RELEASE_INSTALL_SMOKE_PREFLIGHTS: Record<ReleasePlatform, ReleaseInstallSmokePreflight> = {
  windows: {
    platform: 'windows',
    distributionSmoke: 'windows_sandbox_installer_smoke',
    evidenceSource: 'package-smoke',
    packageSmokeCommand: 'node scripts/package-smoke.mjs --sandbox-install --output=dist-packages/package-smoke-windows-${arch}.json',
    requiredCheckIds: ['installer-run', 'installer-subfolder', 'installed-exe'],
    executionHost: 'windows-sandbox',
    disposableInstallRoot: true,
    launchUsesIsolatedAppData: true,
    writesLocalPaths: false,
    readsSigningSecrets: false
  },
  macos: {
    platform: 'macos',
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

export function createReleaseInstallSmokePreflight(
  platform: ReleasePlatform
): ReleaseInstallSmokePreflight {
  const preflight = RELEASE_INSTALL_SMOKE_PREFLIGHTS[platform]
  if (!preflight) throw new Error(`Unsupported release install smoke platform: ${platform}`)
  return cloneReleaseInstallSmokePreflight(preflight)
}

export function listReleaseInstallSmokePreflights(): ReleaseInstallSmokePreflight[] {
  return Object.values(RELEASE_INSTALL_SMOKE_PREFLIGHTS)
    .map(cloneReleaseInstallSmokePreflight)
}

function cloneReleaseInstallSmokePreflight(
  preflight: ReleaseInstallSmokePreflight
): ReleaseInstallSmokePreflight {
  return {
    ...preflight,
    requiredCheckIds: [...preflight.requiredCheckIds]
  }
}
