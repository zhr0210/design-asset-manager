export const RELEASE_TRUST_CHECK_IDS = {
  artifactChecksum: 'artifact_checksum',
  blockmapChecksum: 'blockmap_checksum',
  signature: 'signature',
  hardenedRuntime: 'hardened_runtime',
  nestedSignatures: 'nested_signatures',
  notarization: 'notarization',
  staple: 'staple',
  gatekeeper: 'gatekeeper',
  dmgIntegrity: 'dmg_integrity'
}

export const RELEASE_TRUST_READINESS_CHECK_KEYS = [
  'signature',
  'hardenedRuntime',
  'nestedSignatures',
  'notarization',
  'staple',
  'gatekeeper'
]

const TRUST_READINESS_BINDINGS = {
  windows: [
    ['signature', RELEASE_TRUST_CHECK_IDS.signature]
  ],
  macos: [
    ['signature', RELEASE_TRUST_CHECK_IDS.signature],
    ['hardenedRuntime', RELEASE_TRUST_CHECK_IDS.hardenedRuntime],
    ['nestedSignatures', RELEASE_TRUST_CHECK_IDS.nestedSignatures],
    ['notarization', RELEASE_TRUST_CHECK_IDS.notarization],
    ['staple', RELEASE_TRUST_CHECK_IDS.staple],
    ['gatekeeper', RELEASE_TRUST_CHECK_IDS.gatekeeper]
  ]
}

const TRUST_EVIDENCE_CHECK_IDS = {
  windows: [
    RELEASE_TRUST_CHECK_IDS.artifactChecksum,
    RELEASE_TRUST_CHECK_IDS.blockmapChecksum,
    RELEASE_TRUST_CHECK_IDS.signature
  ],
  macos: [
    RELEASE_TRUST_CHECK_IDS.artifactChecksum,
    RELEASE_TRUST_CHECK_IDS.blockmapChecksum,
    RELEASE_TRUST_CHECK_IDS.signature,
    RELEASE_TRUST_CHECK_IDS.nestedSignatures,
    RELEASE_TRUST_CHECK_IDS.hardenedRuntime,
    RELEASE_TRUST_CHECK_IDS.notarization,
    RELEASE_TRUST_CHECK_IDS.staple,
    RELEASE_TRUST_CHECK_IDS.gatekeeper,
    RELEASE_TRUST_CHECK_IDS.dmgIntegrity
  ]
}

export function listReleaseTrustReadinessBindings(platform) {
  return requirePlatformEntries(TRUST_READINESS_BINDINGS, platform)
    .map(([checkKey, evidenceCheckId]) => ({ checkKey, evidenceCheckId }))
}

export function listReleaseTrustEvidenceCheckIds(platform) {
  return [...requirePlatformEntries(TRUST_EVIDENCE_CHECK_IDS, platform)]
}

function requirePlatformEntries(record, platform) {
  const entries = record[platform]
  if (!entries) throw new Error(`Unsupported release trust platform: ${platform}`)
  return entries
}
