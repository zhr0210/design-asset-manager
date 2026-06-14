export type ReleasePackagingTarget = 'windows-nsis' | 'macos-dmg'
export type ReleasePackagingArch = 'x64' | 'arm64'

export interface ReleasePackagingMatrixEntry {
  target: ReleasePackagingTarget
  os: 'windows-latest' | 'macos-latest'
  arch: ReleasePackagingArch
  command: 'npm run dist:win' | 'npm run dist:mac'
}

export interface ReleaseFlowGovernancePlan {
  phase: '15B'
  matrix: ReleasePackagingMatrixEntry[]
  promotionInvariant: true
  unsignedCandidateArtifacts: true
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
    phase: '15B',
    matrix: [
      { target: 'windows-nsis', os: 'windows-latest', arch: 'x64', command: 'npm run dist:win' },
      { target: 'windows-nsis', os: 'windows-latest', arch: 'arm64', command: 'npm run dist:win' },
      { target: 'macos-dmg', os: 'macos-latest', arch: 'x64', command: 'npm run dist:mac' },
      { target: 'macos-dmg', os: 'macos-latest', arch: 'arm64', command: 'npm run dist:mac' }
    ],
    promotionInvariant: true,
    unsignedCandidateArtifacts: true,
    signingReserved: true,
    notarizationReserved: true,
    universalMacOptional: true,
    releaseWorkflow: true,
    publishEnabled: false,
    autoUpdateEnabled: false,
    destructiveCleanup: false
  }
}

export type ReleasePlatform = 'windows' | 'macos'
export type ReleaseCheckStatus = 'passed' | 'failed' | 'not_run' | 'not_applicable'
export type ReleaseCandidateStage = 'blocked' | 'candidate_ready' | 'distribution_ready' | 'publish_ready'

export type ReleaseGateId =
  | 'build'
  | 'governance'
  | 'artifact'
  | 'checksum'
  | 'package_smoke'
  | 'installer_smoke'
  | 'signature'
  | 'hardened_runtime'
  | 'nested_signatures'
  | 'notarization'
  | 'staple'
  | 'gatekeeper'
  | 'update_metadata'

export interface ReleaseCandidateChecks {
  build: ReleaseCheckStatus
  governance: ReleaseCheckStatus
  artifact: ReleaseCheckStatus
  checksum: ReleaseCheckStatus
  packageSmoke: ReleaseCheckStatus
  installerSmoke: ReleaseCheckStatus
  signature: ReleaseCheckStatus
  hardenedRuntime: ReleaseCheckStatus
  nestedSignatures: ReleaseCheckStatus
  notarization: ReleaseCheckStatus
  staple: ReleaseCheckStatus
  gatekeeper: ReleaseCheckStatus
  updateMetadata: ReleaseCheckStatus
}

export interface ReleaseCandidateInput {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  checks: ReleaseCandidateChecks
  explicitPublishApproval: boolean
}

export interface ReleaseCandidateMissing {
  code: ReleaseGateId | 'publish_approval'
  label: string
  detail: string
}

export interface ReleaseCandidateEvaluation {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  stage: ReleaseCandidateStage
  candidateArtifactAllowed: boolean
  distributionAllowed: boolean
  publishAllowed: boolean
  missing: ReleaseCandidateMissing[]
}

const COMMON_CANDIDATE_GATES: Array<[keyof ReleaseCandidateChecks, ReleaseGateId, string]> = [
  ['build', 'build', '生产构建'],
  ['governance', 'governance', '治理回归'],
  ['artifact', 'artifact', '发行制品'],
  ['checksum', 'checksum', 'SHA-256 清单'],
  ['packageSmoke', 'package_smoke', 'Package Smoke']
]

const WINDOWS_DISTRIBUTION_GATES: Array<[keyof ReleaseCandidateChecks, ReleaseGateId, string]> = [
  ['installerSmoke', 'installer_smoke', 'Windows Sandbox 安装验证'],
  ['signature', 'signature', 'Authenticode 签名'],
  ['updateMetadata', 'update_metadata', '更新元数据']
]

const MACOS_DISTRIBUTION_GATES: Array<[keyof ReleaseCandidateChecks, ReleaseGateId, string]> = [
  ['installerSmoke', 'installer_smoke', 'DMG 安装验证'],
  ['signature', 'signature', 'Developer ID 签名'],
  ['hardenedRuntime', 'hardened_runtime', 'Hardened Runtime'],
  ['nestedSignatures', 'nested_signatures', '嵌套代码签名'],
  ['notarization', 'notarization', 'Apple 公证'],
  ['staple', 'staple', '公证票据装订'],
  ['gatekeeper', 'gatekeeper', 'Gatekeeper 验证'],
  ['updateMetadata', 'update_metadata', '更新元数据']
]

export function evaluateReleaseCandidate(input: ReleaseCandidateInput): ReleaseCandidateEvaluation {
  const commonMissing = collectMissing(input.checks, COMMON_CANDIDATE_GATES)
  if (commonMissing.length > 0) {
    return releaseEvaluation(input, 'blocked', commonMissing)
  }

  const distributionGates = input.platform === 'windows'
    ? WINDOWS_DISTRIBUTION_GATES
    : MACOS_DISTRIBUTION_GATES
  const distributionMissing = collectMissing(input.checks, distributionGates)
  if (distributionMissing.length > 0) {
    return releaseEvaluation(input, 'candidate_ready', distributionMissing)
  }

  if (!input.explicitPublishApproval) {
    return releaseEvaluation(input, 'distribution_ready', [{
      code: 'publish_approval',
      label: '显式发布批准',
      detail: '候选制品已满足分发条件，但发布仍需独立的人工批准。'
    }])
  }

  return releaseEvaluation(input, 'publish_ready', [])
}

function collectMissing(
  checks: ReleaseCandidateChecks,
  gates: Array<[keyof ReleaseCandidateChecks, ReleaseGateId, string]>
): ReleaseCandidateMissing[] {
  return gates
    .filter(([key]) => checks[key] !== 'passed')
    .map(([key, code, label]) => ({
      code,
      label,
      detail: `${label}未通过，当前状态为 ${checks[key]}。`
    }))
}

function releaseEvaluation(
  input: ReleaseCandidateInput,
  stage: ReleaseCandidateStage,
  missing: ReleaseCandidateMissing[]
): ReleaseCandidateEvaluation {
  return {
    platform: input.platform,
    arch: input.arch,
    stage,
    candidateArtifactAllowed: stage !== 'blocked',
    distributionAllowed: stage === 'distribution_ready' || stage === 'publish_ready',
    publishAllowed: stage === 'publish_ready',
    missing
  }
}
