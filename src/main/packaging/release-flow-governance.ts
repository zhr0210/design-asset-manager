export type ReleasePackagingTarget = 'windows-nsis' | 'macos-dmg'
export type ReleasePackagingArch = 'x64' | 'arm64'

export interface ReleasePackagingMatrixEntry {
  target: ReleasePackagingTarget
  os: 'windows-latest' | 'macos-latest'
  arch: ReleasePackagingArch
  command: 'npm run pack:win' | 'npm run pack:mac'
}

export interface ReleaseFlowGovernancePlan {
  phase: '15A'
  matrix: ReleasePackagingMatrixEntry[]
  signingReserved: true
  notarizationReserved: true
  universalMacOptional: true
  releaseWorkflow: true
  publishEnabled: false
  autoUpdateEnabled: false
  destructiveCleanup: false
}

export function createReleaseFlowGovernancePlan(): ReleaseFlowGovernancePlan {
  return {
    phase: '15A',
    matrix: [
      { target: 'windows-nsis', os: 'windows-latest', arch: 'x64', command: 'npm run pack:win' },
      { target: 'windows-nsis', os: 'windows-latest', arch: 'arm64', command: 'npm run pack:win' },
      { target: 'macos-dmg', os: 'macos-latest', arch: 'x64', command: 'npm run pack:mac' },
      { target: 'macos-dmg', os: 'macos-latest', arch: 'arm64', command: 'npm run pack:mac' }
    ],
    signingReserved: true,
    notarizationReserved: true,
    universalMacOptional: true,
    releaseWorkflow: true,
    publishEnabled: false,
    autoUpdateEnabled: false,
    destructiveCleanup: false
  }
}
