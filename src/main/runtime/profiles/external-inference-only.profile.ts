import type { RuntimeProfile } from '../runtime-profile.types'

export const externalInferenceOnlyProfile: RuntimeProfile = {
  id: 'external-inference-only',
  label: 'External Inference Only',
  description: 'Profile for machines that should avoid local AI runtime packages and use external HTTP inference.',
  platform: 'all',
  arch: 'all',
  requirements: ['Configured external inference endpoint'],
  capabilities: ['external-inference', 'tagging'],
  inferenceMode: 'external-http',
  ocrMode: 'external',
  recommendedRuntimeKinds: ['custom-http'],
  recommendedPackages: ['external-inference-config'],
  optionalPackages: [],
  warnings: ['Local AI worker is disabled for this profile.'],
  fallbackProfileId: null,
  isExperimental: false
}
