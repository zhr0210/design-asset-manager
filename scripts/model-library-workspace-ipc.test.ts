import assert from 'node:assert/strict'

import {
  CHANNEL_MODEL_LIBRARY_WORKSPACE_CONFIGURE_STORAGE,
  CHANNEL_MODEL_LIBRARY_WORKSPACE_SUMMARIZE
} from '../src/shared/contracts/model-library-workspace.contract'
import { createModelLibraryWorkspaceIpcHandlers } from
  '../src/main/ipc/model-library-workspace.handlers'

let summarizeCalls = 0
let configureCalls = 0
const handlers = createModelLibraryWorkspaceIpcHandlers({
  getWorkspace(senderId) {
    if (senderId === 18) {
      return {
        async summarize() {
          throw new Error('SECRET:/private/summary')
        },
        async configureStorage() {
          throw new Error('SECRET:/private/configure')
        }
      }
    }
    assert.equal(senderId, 17)
    return {
      async summarize(request) {
        summarizeCalls += 1
        return {
          ok: true as const,
          value: { request }
        } as never
      },
      async configureStorage(request) {
        configureCalls += 1
        return {
          ok: true as const,
          value: { request }
        } as never
      }
    }
  }
})

assert.equal(
  CHANNEL_MODEL_LIBRARY_WORKSPACE_SUMMARIZE,
  'model-library-workspace:summarize'
)
assert.equal(
  CHANNEL_MODEL_LIBRARY_WORKSPACE_CONFIGURE_STORAGE,
  'model-library-workspace:configure-storage'
)

assert.deepEqual(await handlers.summarize(17, { kind: 'page' }), {
  ok: true,
  value: { request: { kind: 'page' } }
})
assert.equal(summarizeCalls, 1)

assert.deepEqual(await handlers.summarize(17, {
  kind: 'page',
  path: '/private/model-root'
}), invalidRequest())
assert.equal(summarizeCalls, 1)

assert.deepEqual(await handlers.configureStorage(17, {
  kind: 'review-recommended-location'
}), {
  ok: true,
  value: { request: { kind: 'review-recommended-location' } }
})
assert.equal(configureCalls, 1)

assert.deepEqual(await handlers.configureStorage(17, {
  kind: 'review-chosen-parent',
  defaultPath: '/private'
}), invalidRequest())
assert.equal(configureCalls, 1)

assert.deepEqual(await handlers.configureStorage(17, {
  kind: 'confirm-reviewed-selection',
  review: `model-storage-review:${'a'.repeat(64)}`,
  decision: 'use-reviewed-model-storage-root'
}), {
  ok: true,
  value: {
    request: {
      kind: 'confirm-reviewed-selection',
      review: `model-storage-review:${'a'.repeat(64)}`,
      decision: 'use-reviewed-model-storage-root'
    }
  }
})
assert.equal(configureCalls, 2)

assert.deepEqual(await handlers.configureStorage(17, {
  kind: 'confirm-reviewed-selection',
  review: 'model-storage-review:not-valid',
  decision: 'use-reviewed-model-storage-root'
}), invalidRequest())
assert.equal(configureCalls, 2)

const hiddenIpcSummaryFailure = await handlers.summarize(18, { kind: 'page' })
assert.deepEqual(hiddenIpcSummaryFailure, {
  ok: false,
  error: {
    code: 'MODULE_UNAVAILABLE',
    retry: 'not-retryable'
  }
})
const hiddenIpcConfigureFailure = await handlers.configureStorage(18, {
  kind: 'review-recommended-location'
})
assert.deepEqual(hiddenIpcConfigureFailure, hiddenIpcSummaryFailure)
assert.doesNotMatch(
  JSON.stringify([hiddenIpcSummaryFailure, hiddenIpcConfigureFailure]),
  /SECRET|private|exception/i
)

console.log('model-library-workspace-ipc passed')

function invalidRequest() {
  return {
    ok: false,
    error: {
      code: 'INVALID_REQUEST',
      retry: 'not-retryable'
    }
  }
}
