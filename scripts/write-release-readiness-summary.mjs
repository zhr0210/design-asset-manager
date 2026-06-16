import fs from 'node:fs/promises'
import path from 'node:path'

const options = parseArgs(process.argv.slice(2))
const platform = requireChoice(options.platform, ['windows', 'macos'], '--platform')
const arch = requireChoice(options.arch, ['x64', 'arm64'], '--arch')
const distDir = path.resolve(options['dist-dir'] ?? 'dist-packages')
const governanceStatus = requireCheckStatus(options.governance ?? 'not_run', '--governance')
const explicitPublishApproval = options['publish-approved'] === 'true'
const outputPath = path.resolve(
  options.output ?? path.join(distDir, `release-readiness-summary-${platform}-${arch}.json`)
)

const reports = {
  checksums: await readOptionalJson(options.checksums ?? path.join(distDir, `release-checksums-${platform}-${arch}.json`)),
  updateMetadata: await readOptionalJson(options.metadata ?? path.join(distDir, `release-update-metadata-${platform}-${arch}.json`)),
  trustEvidence: await readOptionalJson(options.trust ?? path.join(distDir, `release-trust-evidence-${platform}-${arch}.json`)),
  brandingEvidence: await readOptionalJson(options.branding ?? path.join(distDir, `release-branding-evidence-${platform}-${arch}.json`)),
  packageSmoke: await readOptionalJson(options['package-smoke'] ?? path.join(distDir, `package-smoke-${platform}-${arch}.json`))
}

const checks = {
  build: statusFromBoolean(isValidChecksums(reports.checksums.value), reports.checksums.exists),
  governance: governanceStatus,
  artifact: statusFromBoolean(isValidChecksums(reports.checksums.value), reports.checksums.exists),
  checksum: statusFromBoolean(isValidChecksums(reports.checksums.value), reports.checksums.exists),
  packageSmoke: statusFromBoolean(hasNoFailedChecks(reports.packageSmoke.value), reports.packageSmoke.exists),
  branding: statusFromBoolean(hasNoFailedChecks(reports.brandingEvidence.value), reports.brandingEvidence.exists),
  installerSmoke: statusFromBoolean(hasInstallSmoke(reports.packageSmoke.value, platform), reports.packageSmoke.exists),
  signature: statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'signature'), reports.trustEvidence.exists),
  hardenedRuntime: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'hardened_runtime'), reports.trustEvidence.exists)
    : 'not_applicable',
  nestedSignatures: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'nested_signatures'), reports.trustEvidence.exists)
    : 'not_applicable',
  notarization: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'notarization'), reports.trustEvidence.exists)
    : 'not_applicable',
  staple: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'staple'), reports.trustEvidence.exists)
    : 'not_applicable',
  gatekeeper: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'gatekeeper'), reports.trustEvidence.exists)
    : 'not_applicable',
  updateMetadata: statusFromBoolean(isValidUpdateMetadata(reports.updateMetadata.value), reports.updateMetadata.exists)
}

const summary = {
  schemaVersion: 1,
  source: 'release-readiness-evidence',
  publishEnabled: false,
  readsSecretValues: false,
  readsBrandingAssetBytes: false,
  emitsLocalPaths: false,
  platforms: [createPlatformSummary()]
}

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(summary))
if (summary.platforms[0].stage === 'blocked') process.exitCode = 1

function createPlatformSummary() {
  const missing = collectMissing()
  const stage = stageFromMissing(missing)
  return {
    platform,
    arch,
    stage,
    candidateArtifactAllowed: stage !== 'blocked',
    distributionAllowed: stage === 'distribution_ready' || stage === 'publish_ready',
    publishAllowed: stage === 'publish_ready',
    signingEnvironment: platform === 'windows' ? 'release-signing-windows' : 'release-signing-macos',
    signingApprovalInput: 'signing_approved',
    refGate: 'main-or-version-tag',
    requiredEvidence: [
      'release-checksums',
      'release-update-metadata',
      'release-trust-evidence',
      'release-branding-evidence',
      'package-smoke'
    ],
    requiredSecretNames: platform === 'windows'
      ? ['WINDOWS_CSC_LINK', 'WINDOWS_CSC_KEY_PASSWORD']
      : [
          'MACOS_CSC_LINK',
          'MACOS_CSC_KEY_PASSWORD',
          'APPLE_ID',
          'APPLE_APP_SPECIFIC_PASSWORD',
          'APPLE_TEAM_ID'
        ],
    brandingApprovalFile: 'release-branding.json',
    brandingIconFileName: platform === 'windows' ? 'icon.ico' : 'icon.icns',
    checks,
    blockers: missing
  }
}

function collectMissing() {
  const common = [
    ['build', 'build', '生产构建'],
    ['governance', 'governance', '治理回归'],
    ['artifact', 'artifact', '发行制品'],
    ['checksum', 'checksum', 'SHA-256 清单'],
    ['packageSmoke', 'package_smoke', 'Package Smoke']
  ]
  const commonMissing = missingFrom(common, 'candidate')
  if (commonMissing.length > 0) return commonMissing

  const distribution = platform === 'windows'
    ? [
        ['installerSmoke', 'installer_smoke', 'Windows Sandbox 安装验证'],
        ['signature', 'signature', 'Authenticode 签名'],
        ['branding', 'branding', '正式应用图标'],
        ['updateMetadata', 'update_metadata', '更新元数据']
      ]
    : [
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
  const distributionMissing = missingFrom(distribution, 'distribution')
  if (distributionMissing.length > 0) return distributionMissing

  return explicitPublishApproval ? [] : [{
    code: 'publish_approval',
    label: '显式发布批准',
    detail: '候选制品已满足分发条件，但发布仍需独立的人工批准。',
    phase: 'publish',
    severity: 'blocking'
  }]
}

function missingFrom(gates, phase) {
  return gates
    .filter(([key]) => checks[key] !== 'passed')
    .map(([key, code, label]) => ({
      code,
      label,
      detail: `${label}未通过，当前状态为 ${checks[key]}。`,
      phase,
      severity: 'blocking'
    }))
}

function stageFromMissing(missing) {
  if (missing.length === 0) return 'publish_ready'
  if (missing.some((item) => item.phase === 'candidate')) return 'blocked'
  if (missing.some((item) => item.phase === 'distribution')) return 'candidate_ready'
  return 'distribution_ready'
}

async function readOptionalJson(target) {
  try {
    return { exists: true, value: JSON.parse(await fs.readFile(target, 'utf8')) }
  } catch {
    return { exists: false, value: null }
  }
}

function isValidChecksums(value) {
  return value?.schemaVersion === 1
    && value.platform === platform
    && value.arch === arch
    && Array.isArray(value.artifacts)
    && value.artifacts.length > 0
    && value.artifacts.every((artifact) => (
      isSafeFileName(artifact.fileName)
      && Number.isSafeInteger(artifact.sizeBytes)
      && artifact.sizeBytes >= 0
      && isSha256(artifact.sha256)
    ))
}

function isValidUpdateMetadata(value) {
  return value?.schemaVersion === 1
    && value.platform === platform
    && value.arch === arch
    && isSafeFileName(value.artifact?.fileName)
    && isSafeFileName(value.artifact?.blockmap?.fileName)
    && value.artifact.blockmap.fileName === `${value.artifact.fileName}.blockmap`
    && Number.isSafeInteger(value.artifact.sizeBytes)
    && Number.isSafeInteger(value.artifact.blockmap.sizeBytes)
    && isSha256(value.artifact.sha256)
    && isSha256(value.artifact.blockmap.sha256)
}

function hasNoFailedChecks(value) {
  return Array.isArray(value?.checks)
    && value.checks.length > 0
    && value.checks.every((check) => check.status === 'passed' || check.status === 'skipped')
}

function hasInstallSmoke(value, targetPlatform) {
  const required = targetPlatform === 'windows'
    ? ['installer-run', 'installer-subfolder', 'installed-exe']
    : ['dmg-mount', 'dmg-copy', 'dmg-installed-launch', 'dmg-detach']
  return required.every((id) => hasPassedCheck(value, id))
}

function hasPassedCheck(value, id) {
  return Array.isArray(value?.checks)
    && value.checks.some((check) => check.id === id && check.status === 'passed')
}

function statusFromBoolean(passed, exists) {
  if (passed) return 'passed'
  return exists ? 'failed' : 'not_run'
}

function parseArgs(args) {
  return Object.fromEntries(args.map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (!match) throw new Error(`Invalid argument: ${arg}`)
    return [match[1], match[2]]
  }))
}

function requireChoice(value, choices, flag) {
  if (!choices.includes(value)) {
    throw new Error(`${flag} must be one of: ${choices.join(', ')}`)
  }
  return value
}

function requireCheckStatus(value, flag) {
  return requireChoice(value, ['passed', 'failed', 'not_run', 'not_applicable'], flag)
}

function isSafeFileName(value) {
  return typeof value === 'string'
    && value.length > 0
    && !/[\\/\0]/.test(value)
    && path.basename(value) === value
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
}
