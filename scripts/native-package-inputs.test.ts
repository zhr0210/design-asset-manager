import assert from 'node:assert/strict'
import { verifyNativePackageInputs } from './native-package-inputs.mjs'

const platform = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : null
assert.throws(() => verifyNativePackageInputs({ platform: 'linux' }), /actual target platform/)
if (platform) {
  assert.throws(() => verifyNativePackageInputs({ platform, arch: process.arch === 'x64' ? 'arm64' : 'x64' }), /actual target platform/)
  assert.throws(() => verifyNativePackageInputs({ platform: platform === 'win' ? 'mac' : 'win' }), /actual target platform/)
  const actual = verifyNativePackageInputs({ platform })
  assert.equal(actual.platform, process.platform)
  assert.equal(actual.arch, process.arch)
  assert.ok(actual.bindings.length >= 2)
  assert.ok(actual.bindings.every(binding => /^[a-f0-9]{64}$/.test(binding.sha256)))
  console.log(JSON.stringify({ actualRuntime: actual.electron, abi: actual.abi, target: actual.platform + '-' + actual.arch,
    nativeLoaded: actual.bindings.map(binding => binding.file), wrongTargets: 'refused before probing' }))
}
