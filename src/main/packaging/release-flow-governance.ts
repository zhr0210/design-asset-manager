export type ReleasePackagingTarget = 'windows-nsis' | 'macos-dmg'
export type ReleasePackagingArch = 'x64' | 'arm64'
export type ReleasePlatform = 'windows' | 'macos'
export type ReleaseRunnerLabel = 'windows-2022' | 'macos-latest'
export type ReleaseDistCommand = 'npm run dist:win' | 'npm run dist:mac'
export type ReleaseSignedCandidateEnvironment = 'release-signing-windows' | 'release-signing-macos'
export type ReleaseSignedCandidateJobName = 'windows-signed-candidate' | 'macos-signed-candidate'
export type ReleaseBrandingIconFileName = 'icon.ico' | 'icon.icns'
export type ReleaseBrandingEvidenceIconCheckId = 'windows_icon' | 'macos_icon'
export type ReleaseSignedCandidateArtifactNamePattern =
  | 'design-asset-manager-windows-${arch}-signed-candidate'
  | 'design-asset-manager-macos-${arch}-signed-candidate'

export interface ReleasePackagingMatrixEntry {
  target: ReleasePackagingTarget
  os: ReleaseRunnerLabel
  arch: ReleasePackagingArch
  command: ReleaseDistCommand
}

export interface ReleasePlatformTargetDefinition {
  platform: ReleasePlatform
  packagingTarget: ReleasePackagingTarget
  runnerLabel: ReleaseRunnerLabel
  distCommand: ReleaseDistCommand
  supportedArches: readonly ReleasePackagingArch[]
  defaultEvidenceBundleArch: ReleasePackagingArch
  signedCandidateEnvironment: ReleaseSignedCandidateEnvironment
  signedCandidateJobName: ReleaseSignedCandidateJobName
  signedCandidateArtifactNamePattern: ReleaseSignedCandidateArtifactNamePattern
  requiredSecretNames: readonly string[]
  brandingIconFileName: ReleaseBrandingIconFileName
  brandingEvidenceIconCheckId: ReleaseBrandingEvidenceIconCheckId
}

export const RELEASE_PACKAGING_ARCHES: readonly ReleasePackagingArch[] = ['x64', 'arm64']

const WINDOWS_RELEASE_PLATFORM_TARGET: ReleasePlatformTargetDefinition = {
  platform: 'windows',
  packagingTarget: 'windows-nsis',
  runnerLabel: 'windows-2022',
  distCommand: 'npm run dist:win',
  supportedArches: RELEASE_PACKAGING_ARCHES,
  defaultEvidenceBundleArch: 'x64',
  signedCandidateEnvironment: 'release-signing-windows',
  signedCandidateJobName: 'windows-signed-candidate',
  signedCandidateArtifactNamePattern: 'design-asset-manager-windows-${arch}-signed-candidate',
  requiredSecretNames: ['WINDOWS_CSC_LINK', 'WINDOWS_CSC_KEY_PASSWORD'],
  brandingIconFileName: 'icon.ico',
  brandingEvidenceIconCheckId: 'windows_icon'
}

const MACOS_RELEASE_PLATFORM_TARGET: ReleasePlatformTargetDefinition = {
  platform: 'macos',
  packagingTarget: 'macos-dmg',
  runnerLabel: 'macos-latest',
  distCommand: 'npm run dist:mac',
  supportedArches: RELEASE_PACKAGING_ARCHES,
  defaultEvidenceBundleArch: 'arm64',
  signedCandidateEnvironment: 'release-signing-macos',
  signedCandidateJobName: 'macos-signed-candidate',
  signedCandidateArtifactNamePattern: 'design-asset-manager-macos-${arch}-signed-candidate',
  requiredSecretNames: [
    'MACOS_CSC_LINK',
    'MACOS_CSC_KEY_PASSWORD',
    'APPLE_ID',
    'APPLE_APP_SPECIFIC_PASSWORD',
    'APPLE_TEAM_ID'
  ],
  brandingIconFileName: 'icon.icns',
  brandingEvidenceIconCheckId: 'macos_icon'
}

export const RELEASE_PLATFORM_TARGETS: readonly ReleasePlatformTargetDefinition[] = [
  WINDOWS_RELEASE_PLATFORM_TARGET,
  MACOS_RELEASE_PLATFORM_TARGET
]

const RELEASE_PLATFORM_TARGETS_BY_PLATFORM: Readonly<Record<ReleasePlatform, ReleasePlatformTargetDefinition>> = {
  windows: WINDOWS_RELEASE_PLATFORM_TARGET,
  macos: MACOS_RELEASE_PLATFORM_TARGET
}

export function listReleasePlatformTargets(): ReleasePlatformTargetDefinition[] {
  return RELEASE_PLATFORM_TARGETS.map(cloneReleasePlatformTarget)
}

export function getReleasePlatformTarget(platform: ReleasePlatform): ReleasePlatformTargetDefinition {
  const target = RELEASE_PLATFORM_TARGETS_BY_PLATFORM[platform]
  if (!target) throw new Error(`Unsupported release platform: ${platform}`)
  return cloneReleasePlatformTarget(target)
}

function cloneReleasePlatformTarget(target: ReleasePlatformTargetDefinition): ReleasePlatformTargetDefinition {
  return {
    ...target,
    supportedArches: [...target.supportedArches],
    requiredSecretNames: [...target.requiredSecretNames]
  }
}

export interface ReleaseFlowGovernancePlan {
  phase: '15C'
  matrix: ReleasePackagingMatrixEntry[]
  promotionInvariant: true
  unsignedCandidateArtifacts: true
  signedCandidateWorkflow: true
  signingEnvironmentApproval: true
  trustEvidence: true
  notarizationEvidence: true
  releaseUpdateMetadata: true
  universalMacOptional: true
  releaseWorkflow: true
  publishEnabled: false
  autoUpdateEnabled: false
  destructiveCleanup: false
}

export function createReleaseFlowGovernancePlan(): ReleaseFlowGovernancePlan {
  return {
    phase: '15C',
    matrix: RELEASE_PLATFORM_TARGETS.flatMap((target) =>
      target.supportedArches.map((arch) => ({
        target: target.packagingTarget,
        os: target.runnerLabel,
        arch,
        command: target.distCommand
      }))
    ),
    promotionInvariant: true,
    unsignedCandidateArtifacts: true,
    signedCandidateWorkflow: true,
    signingEnvironmentApproval: true,
    trustEvidence: true,
    notarizationEvidence: true,
    releaseUpdateMetadata: true,
    universalMacOptional: true,
    releaseWorkflow: true,
    publishEnabled: false,
    autoUpdateEnabled: false,
    destructiveCleanup: false
  }
}

export type ReleaseCheckStatus = 'passed' | 'failed' | 'not_run' | 'not_applicable'
export type ReleaseCandidateStage = 'blocked' | 'candidate_ready' | 'distribution_ready' | 'publish_ready'

export type ReleaseGateId =
  | 'build'
  | 'governance'
  | 'artifact'
  | 'checksum'
  | 'package_smoke'
  | 'branding'
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
  branding: ReleaseCheckStatus
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

type ReleaseCandidateGate = [keyof ReleaseCandidateChecks, ReleaseGateId, string]

const COMMON_CANDIDATE_GATES: ReleaseCandidateGate[] = [
  ['build', 'build', '生产构建'],
  ['governance', 'governance', '治理回归'],
  ['artifact', 'artifact', '发行制品'],
  ['checksum', 'checksum', 'SHA-256 清单'],
  ['packageSmoke', 'package_smoke', 'Package Smoke']
]

const DISTRIBUTION_GATES_BY_PLATFORM: Record<ReleasePlatform, ReleaseCandidateGate[]> = {
  windows: [
    ['installerSmoke', 'installer_smoke', 'Windows Sandbox 安装验证'],
    ['signature', 'signature', 'Authenticode 签名'],
    ['branding', 'branding', '正式应用图标'],
    ['updateMetadata', 'update_metadata', '更新元数据']
  ],
  macos: [
    ['installerSmoke', 'installer_smoke', 'DMG 安装验证'],
    ['signature', 'signature', 'Developer ID 签名'],
    ['hardenedRuntime', 'hardened_runtime', 'Hardened Runtime'],
    ['nestedSignatures', 'nested_signatures', '嵌套代码签名'],
    ['notarization', 'notarization', 'Apple 公证'],
    ['staple', 'staple', '公证票据装订'],
    ['gatekeeper', 'gatekeeper', 'Gatekeeper 验证'],
    ['branding', 'branding', '正式应用图标'],
    ['updateMetadata', 'update_metadata', '更新元数据']
  ]
}

export function evaluateReleaseCandidate(input: ReleaseCandidateInput): ReleaseCandidateEvaluation {
  const commonMissing = collectMissing(input.checks, COMMON_CANDIDATE_GATES)
  if (commonMissing.length > 0) {
    return releaseEvaluation(input, 'blocked', commonMissing)
  }

  const distributionGates = listReleaseCandidateDistributionGates(input.platform)
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

export function listReleaseCandidateDistributionGates(platform: ReleasePlatform): ReleaseCandidateGate[] {
  return cloneReleaseCandidateGates(DISTRIBUTION_GATES_BY_PLATFORM[platform])
}

export function listReleaseCandidateCommonGates(): ReleaseCandidateGate[] {
  return cloneReleaseCandidateGates(COMMON_CANDIDATE_GATES)
}

function collectMissing(
  checks: ReleaseCandidateChecks,
  gates: ReleaseCandidateGate[]
): ReleaseCandidateMissing[] {
  return gates
    .filter(([key]) => checks[key] !== 'passed')
    .map(([key, code, label]) => ({
      code,
      label,
      detail: `${label}未通过，当前状态为 ${checks[key]}。`
    }))
}

function cloneReleaseCandidateGates(gates: ReleaseCandidateGate[]): ReleaseCandidateGate[] {
  return gates.map(([key, code, label]) => [key, code, label])
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
