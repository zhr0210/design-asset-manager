import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createAiPythonRuntimeHostContext } from '../src/main/services/ai-python-runtime-host-context'

const explicit = createAiPythonRuntimeHostContext({
  platform: 'win32',
  environment: {
    DESIGN_ASSET_MANAGER_PYTHON: 'python-fixture',
    USERPROFILE: 'C:\\Users\\Fixture'
  }
})

assert.deepEqual(explicit, {
  platform: 'win32',
  environment: {
    DESIGN_ASSET_MANAGER_PYTHON: 'python-fixture',
    USERPROFILE: 'C:\\Users\\Fixture'
  }
})

explicit.environment.DESIGN_ASSET_MANAGER_PYTHON = 'mutated'
assert.equal(
  createAiPythonRuntimeHostContext({
    platform: 'win32',
    environment: {
      DESIGN_ASSET_MANAGER_PYTHON: 'python-fixture'
    }
  }).environment.DESIGN_ASSET_MANAGER_PYTHON,
  'python-fixture'
)

const hostDefault = createAiPythonRuntimeHostContext()
assert.equal(hostDefault.platform, process.platform)
assert.notEqual(hostDefault.environment, process.env)

const adapterSource = await fs.readFile('src/main/services/ai-python-runtime.service.ts', 'utf8')
const hostContextSource = await fs.readFile('src/main/services/ai-python-runtime-host-context.ts', 'utf8')

assert.match(adapterSource, /createAiPythonRuntimeHostContext\(\)/)
assert.doesNotMatch(adapterSource, /platform:\s*process\.platform/)
assert.match(hostContextSource, /platform: input\.platform \?\? process\.platform/)
assert.match(hostContextSource, /environment: \{ \.\.\.\(input\.environment \?\? process\.env\) \}/)

console.log('ai-python-runtime-host-context passed')
