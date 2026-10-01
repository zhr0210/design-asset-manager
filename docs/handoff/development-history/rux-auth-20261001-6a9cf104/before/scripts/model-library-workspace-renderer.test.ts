import assert from 'node:assert/strict'

import {
  createModelLibraryWorkspaceModule,
  projectModelStorageCondition
} from
  '../src/renderer/modules/model-library-workspace/model-library-workspace.module'
import { createInMemoryModelLibraryWorkspaceAdapter } from
  '../src/renderer/modules/model-library-workspace/in-memory-model-library-workspace.adapter'

let summarizeCalls = 0
const pageSummary = {
  catalog: {
    state: 'unavailable' as const,
    source: 'bundled-official' as const,
    reason: 'BUNDLE_MISSING' as const
  },
  storage: {
    state: 'not-configured' as const
  }
}
const module = createModelLibraryWorkspaceModule(
  createInMemoryModelLibraryWorkspaceAdapter({
    async summarize(request) {
      summarizeCalls += 1
      assert.deepEqual(request, { kind: 'page' })
      return { ok: true, value: pageSummary }
    }
  })
)

assert.deepEqual(await module.loadPage(), {
  state: 'ready',
  summary: pageSummary
})
assert.equal(summarizeCalls, 1)

const storageConditionTitles = {
  'not-observed': '模型存储尚未检查',
  available: '模型存储可用',
  unavailable: '模型存储暂不可用',
  'wrong-identity': '模型存储身份不匹配',
  'read-only': '模型存储为只读',
  unsafe: '模型存储不安全',
  'schema-unsupported': '模型存储版本不受支持',
  'integrity-failed': '模型存储完整性检查失败',
  busy: '模型存储正在使用中',
  'recovery-blocked': '模型存储需要恢复'
} as const
for (const [condition, title] of Object.entries(storageConditionTitles)) {
  const projection = projectModelStorageCondition(
    condition as keyof typeof storageConditionTitles
  )
  assert.equal(projection.title, title)
  assert.equal(projection.tone === 'positive', condition === 'available')
}

assert.deepEqual(await createModelLibraryWorkspaceModule(null).loadPage(), {
  state: 'bridge-unavailable'
})

const aiConsoleModule = createModelLibraryWorkspaceModule(
  createInMemoryModelLibraryWorkspaceAdapter({
    async summarize(request) {
      assert.deepEqual(request, { kind: 'ai-console' })
      return {
        ok: true,
        value: {
          catalog: {
            state: 'available',
            familyCount: 1,
            variantCount: 1
          },
          storage: { state: 'available' },
          destination: 'model-library'
        }
      }
    }
  })
)
assert.deepEqual(await aiConsoleModule.loadAiConsoleSummary(), {
  state: 'ready',
  summary: {
    catalog: {
      state: 'available',
      familyCount: 1,
      variantCount: 1
    },
    storage: { state: 'available' },
    destination: 'model-library'
  }
})

const storageReviewResponse = {
  ok: true as const,
  value: {
    state: 'review-required' as const,
    review: `model-storage-review:${'b'.repeat(64)}`,
    effect: 'provision-and-select-first-root' as const,
    location: {
      volumeName: '应用推荐位置',
      managedFolderName: 'Design Asset Manager Model Library'
    },
    consequences: {
      provisionsAppOwnedRoot: true as const,
      updatesDeviceLocalRegistration: true as const,
      movesModelBytes: false as const,
      deletesModelBytes: false as const,
      performsMigration: false as const,
      importsModels: false as const,
      installsModels: false as const,
      activatesModel: false as const,
      startsRuntime: false as const,
      startsInference: false as const
    }
  }
}
const interactiveModule = createModelLibraryWorkspaceModule(
  createInMemoryModelLibraryWorkspaceAdapter({
    async summarize() {
      return { ok: true, value: pageSummary }
    },
    async configureStorage(request) {
      assert.deepEqual(request, { kind: 'review-recommended-location' })
      return storageReviewResponse
    }
  })
)
assert.deepEqual(await interactiveModule.reviewStorage('recommended'), {
  state: 'review-required',
  review: storageReviewResponse.value
})

const configuredSummary = {
  ...pageSummary,
  storage: {
    state: 'configured' as const,
    registration: 'model-storage-registration:11111111111111111111111111111111',
    condition: 'available' as const,
    location: null
  }
}
let confirmed = false
const confirmModule = createModelLibraryWorkspaceModule(
  createInMemoryModelLibraryWorkspaceAdapter({
    async summarize() {
      return {
        ok: true,
        value: confirmed ? configuredSummary : pageSummary
      }
    },
    async configureStorage(request) {
      assert.deepEqual(request, {
        kind: 'confirm-reviewed-selection',
        review: storageReviewResponse.value.review,
        decision: 'use-reviewed-model-storage-root'
      })
      confirmed = true
      return {
        ok: true,
        value: {
          disposition: 'selected-first-root',
          storage: configuredSummary.storage
        }
      }
    }
  })
)
assert.deepEqual(await confirmModule.confirmStorage(
  storageReviewResponse.value.review
), {
  state: 'ready',
  summary: configuredSummary
})

console.log('model-library-workspace-renderer passed')
