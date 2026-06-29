import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { projectLlamaMacHardwareProfile } from '../src/main/services/llama-runtime/llama-runtime-macos-hardware-profile'

const appleSilicon = projectLlamaMacHardwareProfile({
  arch: 'arm64',
  chipName: 'Apple M3 Pro',
  totalMemoryGB: 32
})
assert.deepEqual(appleSilicon, {
  isAppleSilicon: true,
  gpuName: 'Apple M3 Pro 统一内存 GPU',
  totalVramGB: 20.8,
  recommendedAccelerator: 'metal',
  unifiedMemoryWarning: '按 Apple 统一内存估算可用于本地推理的显存预算约 20.8 GB。'
})

const intelMac = projectLlamaMacHardwareProfile({
  arch: 'x64',
  chipName: 'Intel Core i9',
  displaySummary: 'AMD Radeon Pro / 8 GB',
  totalMemoryGB: 64
})
assert.deepEqual(intelMac, {
  isAppleSilicon: false,
  gpuName: 'AMD Radeon Pro / 8 GB',
  totalVramGB: undefined,
  recommendedAccelerator: 'cpu',
  unifiedMemoryWarning: undefined
})

const detectedByChipName = projectLlamaMacHardwareProfile({
  arch: 'x64',
  chipName: 'Apple Silicon',
  totalMemoryGB: 4
})
assert.equal(detectedByChipName.isAppleSilicon, true)
assert.equal(detectedByChipName.totalVramGB, 4)
assert.equal(detectedByChipName.recommendedAccelerator, 'metal')

const helperSource = await fs.readFile('src/main/services/llama-runtime/llama-runtime-macos-hardware-profile.ts', 'utf8')
const installerSource = await fs.readFile('src/main/services/llama-runtime/llama-runtime-install.service.ts', 'utf8')
assert.match(helperSource, /APPLE_SILICON_CHIP_PATTERN/)
assert.match(helperSource, /projectLlamaMacHardwareProfile/)
assert.match(installerSource, /projectLlamaMacHardwareProfile/)
assert.doesNotMatch(installerSource, /Apple\\s\+M\\d\|Apple\\s\+Silicon/)
assert.doesNotMatch(installerSource, /hostContext\.arch === 'arm64' \|\|/)
assert.doesNotMatch(installerSource, /isAppleSilicon \? 'metal' : 'cpu'/)

console.log('llama-runtime-macos-hardware-profile passed')
