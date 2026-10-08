import assert from 'node:assert/strict'

import { createModelLibraryWorkspacePreloadApi } from
  '../src/preload/model-library-workspace.preload'

const invocations: Array<{ channel: string; request: unknown }> = []
const api = createModelLibraryWorkspacePreloadApi({
  invoke: async (channel, request) => {
    invocations.push({ channel, request })
    return { ok: true, value: { channel } }
  }
})

assert.deepEqual(Object.keys(api), ['summarize', 'configureStorage'])
assert.equal(Object.isFrozen(api), true)

await api.summarize({ kind: 'page' })
await api.configureStorage({ kind: 'review-recommended-location' })

assert.deepEqual(invocations, [{
  channel: 'model-library-workspace:summarize',
  request: { kind: 'page' }
}, {
  channel: 'model-library-workspace:configure-storage',
  request: { kind: 'review-recommended-location' }
}])

assert.doesNotMatch(
  JSON.stringify(invocations),
  /path|directory|locator|identity|defaultPath/i
)

console.log('model-library-workspace-preload passed')
