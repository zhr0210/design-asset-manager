export const ELECTRON_BUILDER_RUNNER_PLATFORMS = ['win', 'mac']
export const ELECTRON_BUILDER_RUNNER_MODES = ['dir', 'dist']
export const ELECTRON_BUILDER_SIGNING_MODES = ['disabled', 'required']

const COMMON_SIGNING_ENV_KEYS = [
  'CSC_LINK',
  'CSC_NAME',
  'CSC_KEY_PASSWORD',
  'WIN_CSC_LINK',
  'WIN_CSC_NAME',
  'WIN_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
  'DAM_MAC_SIGNING_IDENTITY'
]

const PLATFORM_OPTIONS = {
  win: {
    builderFlag: '--win',
    requiredSigningEnvKeys: ['CSC_LINK', 'CSC_KEY_PASSWORD'],
    usesMacIdentity: false
  },
  mac: {
    builderFlag: '--mac',
    requiredSigningEnvKeys: [
      'CSC_LINK',
      'CSC_KEY_PASSWORD',
      'APPLE_ID',
      'APPLE_APP_SPECIFIC_PASSWORD',
      'APPLE_TEAM_ID',
      'DAM_MAC_SIGNING_IDENTITY'
    ],
    usesMacIdentity: true
  }
}

export function parseElectronBuilderRunnerOptions(options) {
  return {
    platform: requireElectronBuilderPlatform(options.platform),
    mode: requireElectronBuilderMode(options.mode),
    signing: requireElectronBuilderSigning(options.signing ?? 'disabled')
  }
}

export function requireElectronBuilderPlatform(value, flag = '--platform') {
  return requireChoice(value, ELECTRON_BUILDER_RUNNER_PLATFORMS, flag)
}

export function requireElectronBuilderMode(value, flag = '--mode') {
  return requireChoice(value, ELECTRON_BUILDER_RUNNER_MODES, flag)
}

export function requireElectronBuilderSigning(value, flag = '--signing') {
  return requireChoice(value, ELECTRON_BUILDER_SIGNING_MODES, flag)
}

export function getElectronBuilderPlatformOptions(platform) {
  const options = PLATFORM_OPTIONS[platform]
  if (!options) throw new Error(`Unsupported electron-builder platform: ${platform}`)
  return {
    builderFlag: options.builderFlag,
    requiredSigningEnvKeys: [...options.requiredSigningEnvKeys],
    usesMacIdentity: options.usesMacIdentity
  }
}

export function listElectronBuilderSigningEnvKeys() {
  return [...COMMON_SIGNING_ENV_KEYS]
}

function requireChoice(value, choices, flag) {
  if (!choices.includes(value)) {
    throw new Error(`${flag} must be one of: ${choices.join(', ')}`)
  }
  return value
}
