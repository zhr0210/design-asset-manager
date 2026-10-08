import type {
  ModelLibraryWorkspaceConfigureStorageRequest,
  ModelLibraryWorkspaceSummaryRequest
} from '../../../shared/contracts/model-library-workspace.contract'

export interface ModelLibraryWorkspaceAdapter {
  summarize(request: ModelLibraryWorkspaceSummaryRequest): Promise<unknown>
  configureStorage?(
    request: ModelLibraryWorkspaceConfigureStorageRequest
  ): Promise<unknown>
}

export interface ModelLibraryPageSummary {
  readonly catalog: {
    readonly state: 'available' | 'unavailable'
    readonly [key: string]: unknown
  }
  readonly storage:
    | { readonly state: 'not-configured' }
    | {
        readonly state: 'configured'
        readonly registration: string
        readonly condition: ModelLibraryStorageCondition
        readonly location: {
          readonly volumeName: string
          readonly managedFolderName: string
        } | null
      }
}

export type ModelLibraryStorageCondition =
  | 'not-observed'
  | 'available'
  | 'unavailable'
  | 'wrong-identity'
  | 'read-only'
  | 'unsafe'
  | 'schema-unsupported'
  | 'integrity-failed'
  | 'busy'
  | 'recovery-blocked'

export interface ModelLibraryStorageConditionPresentation {
  readonly tone: 'neutral' | 'positive' | 'attention' | 'danger'
  readonly title: string
  readonly detail: string
}

const MODEL_STORAGE_CONDITION_PRESENTATIONS: Readonly<
  Record<ModelLibraryStorageCondition, ModelLibraryStorageConditionPresentation>
> = Object.freeze({
  'not-observed': {
    tone: 'neutral',
    title: '模型存储尚未检查',
    detail: '进入模型库或手动刷新后，应用会进行一次受限的只读检查。'
  },
  available: {
    tone: 'positive',
    title: '模型存储可用',
    detail: '已确认当前设备登记的受管模型存储。'
  },
  unavailable: {
    tone: 'attention',
    title: '模型存储暂不可用',
    detail: '已登记的位置当前无法访问，请检查磁盘或连接状态。'
  },
  'wrong-identity': {
    tone: 'danger',
    title: '模型存储身份不匹配',
    detail: '当前位置不是已登记的模型存储；应用不会自动切换或迁移。'
  },
  'read-only': {
    tone: 'attention',
    title: '模型存储为只读',
    detail: '应用无法取得受管写权限，请检查磁盘或系统权限。'
  },
  unsafe: {
    tone: 'danger',
    title: '模型存储不安全',
    detail: '目录结构或所有权证据不符合安全要求，当前操作已阻止。'
  },
  'schema-unsupported': {
    tone: 'danger',
    title: '模型存储版本不受支持',
    detail: '当前版本不能安全解释此存储结构，不会尝试自动修改。'
  },
  'integrity-failed': {
    tone: 'danger',
    title: '模型存储完整性检查失败',
    detail: '权威元数据无法通过检查，当前操作已阻止。'
  },
  busy: {
    tone: 'attention',
    title: '模型存储正在使用中',
    detail: '另一个受信会话正在持有写权限，请稍后再次检查。'
  },
  'recovery-blocked': {
    tone: 'attention',
    title: '模型存储需要恢复',
    detail: '检测到未完成事务；恢复完成前不会继续配置或写入。'
  }
})

export function projectModelStorageCondition(
  condition: ModelLibraryStorageCondition
): ModelLibraryStorageConditionPresentation {
  return MODEL_STORAGE_CONDITION_PRESENTATIONS[condition]
}

export type ModelLibraryPageSnapshot =
  | { readonly state: 'bridge-unavailable' }
  | {
      readonly state: 'ready'
      readonly summary: ModelLibraryPageSummary
    }
  | { readonly state: 'unavailable' }

export interface ModelLibraryAiConsoleSummary {
  readonly catalog: {
    readonly state: 'available' | 'unavailable'
    readonly [key: string]: unknown
  }
  readonly storage: {
    readonly state:
      | 'setup-required'
      | 'not-observed'
      | 'available'
      | 'attention-required'
    readonly [key: string]: unknown
  }
  readonly destination: 'model-library'
}

export type ModelLibraryAiConsoleSnapshot =
  | { readonly state: 'bridge-unavailable' }
  | {
      readonly state: 'ready'
      readonly summary: ModelLibraryAiConsoleSummary
    }
  | { readonly state: 'unavailable' }

export interface ModelLibraryStorageReviewProjection {
  readonly state: 'review-required'
  readonly review: string
  readonly effect:
    | 'provision-and-select-first-root'
    | 'reconnect-current-root'
  readonly location: {
    readonly volumeName: string
    readonly managedFolderName: string
  }
  readonly consequences: Record<string, boolean>
}

export type ModelLibraryStorageReviewSnapshot =
  | { readonly state: 'bridge-unavailable' }
  | { readonly state: 'unavailable' }
  | { readonly state: 'cancelled' }
  | { readonly state: 'blocked'; readonly reason: string }
  | {
      readonly state: 'review-required'
      readonly review: ModelLibraryStorageReviewProjection
    }

export interface ModelLibraryWorkspaceModule {
  loadPage(): Promise<ModelLibraryPageSnapshot>
  loadAiConsoleSummary(): Promise<ModelLibraryAiConsoleSnapshot>
  reviewStorage(
    source: 'recommended' | 'choose-parent'
  ): Promise<ModelLibraryStorageReviewSnapshot>
  confirmStorage(review: string): Promise<ModelLibraryPageSnapshot>
}

export function createModelLibraryWorkspaceModule(
  adapter: ModelLibraryWorkspaceAdapter | null | undefined
): ModelLibraryWorkspaceModule {
  return Object.freeze({
    async loadPage(): Promise<ModelLibraryPageSnapshot> {
      if (!adapter) {
        return { state: 'bridge-unavailable' }
      }

      try {
        const response = await adapter.summarize({ kind: 'page' })
        const summary = readSuccessfulPageSummary(response)
        return summary
          ? { state: 'ready', summary }
          : { state: 'unavailable' }
      } catch {
        return { state: 'unavailable' }
      }
    },
    async loadAiConsoleSummary(): Promise<ModelLibraryAiConsoleSnapshot> {
      if (!adapter) return { state: 'bridge-unavailable' }
      try {
        const response = await adapter.summarize({ kind: 'ai-console' })
        const summary = readSuccessfulAiConsoleSummary(response)
        return summary
          ? { state: 'ready', summary }
          : { state: 'unavailable' }
      } catch {
        return { state: 'unavailable' }
      }
    },
    async reviewStorage(
      source: 'recommended' | 'choose-parent'
    ): Promise<ModelLibraryStorageReviewSnapshot> {
      if (!adapter?.configureStorage) return { state: 'bridge-unavailable' }
      try {
        const response = await adapter.configureStorage({
          kind: source === 'recommended'
            ? 'review-recommended-location'
            : 'review-chosen-parent'
        })
        return readStorageReviewSnapshot(response)
      } catch {
        return { state: 'unavailable' }
      }
    },
    async confirmStorage(review: string): Promise<ModelLibraryPageSnapshot> {
      if (
        !adapter?.configureStorage ||
        !/^model-storage-review:[a-f0-9]{64}$/.test(review)
      ) {
        return adapter ? { state: 'unavailable' } : { state: 'bridge-unavailable' }
      }
      try {
        const confirmation = await adapter.configureStorage({
          kind: 'confirm-reviewed-selection',
          review,
          decision: 'use-reviewed-model-storage-root'
        })
        if (!isRecord(confirmation) || confirmation.ok !== true) {
          return { state: 'unavailable' }
        }
        const response = await adapter.summarize({ kind: 'page' })
        const summary = readSuccessfulPageSummary(response)
        return summary
          ? { state: 'ready', summary }
          : { state: 'unavailable' }
      } catch {
        return { state: 'unavailable' }
      }
    }
  })
}

function readSuccessfulPageSummary(value: unknown): ModelLibraryPageSummary | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.value)) {
    return null
  }

  const summary = value.value
  if (!isRecord(summary.catalog) || !isRecord(summary.storage)) {
    return null
  }
  if (summary.catalog.state !== 'available' && summary.catalog.state !== 'unavailable') {
    return null
  }
  if (summary.storage.state !== 'not-configured' && summary.storage.state !== 'configured') {
    return null
  }
  if (
    summary.storage.state === 'configured' && (
      typeof summary.storage.registration !== 'string' ||
      !/^model-storage-registration:[a-f0-9]{32}$/.test(
        summary.storage.registration
      ) ||
      !isModelLibraryStorageCondition(summary.storage.condition) ||
      !isStorageLocation(summary.storage.location)
    )
  ) return null

  return summary as unknown as ModelLibraryPageSummary
}

function isModelLibraryStorageCondition(
  value: unknown
): value is ModelLibraryStorageCondition {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(
    MODEL_STORAGE_CONDITION_PRESENTATIONS,
    value
  )
}

function isStorageLocation(value: unknown): boolean {
  return value === null || (
    isRecord(value) &&
    typeof value.volumeName === 'string' &&
    typeof value.managedFolderName === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readSuccessfulAiConsoleSummary(
  value: unknown
): ModelLibraryAiConsoleSummary | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.value)) {
    return null
  }
  const summary = value.value
  if (
    !isRecord(summary.catalog) ||
    (summary.catalog.state !== 'available' &&
      summary.catalog.state !== 'unavailable') ||
    !isRecord(summary.storage) ||
    ![
      'setup-required',
      'not-observed',
      'available',
      'attention-required'
    ].includes(String(summary.storage.state)) ||
    summary.destination !== 'model-library'
  ) {
    return null
  }
  return summary as unknown as ModelLibraryAiConsoleSummary
}

function readStorageReviewSnapshot(
  value: unknown
): ModelLibraryStorageReviewSnapshot {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.value)) {
    return { state: 'unavailable' }
  }
  const review = value.value
  if (review.state === 'cancelled') return { state: 'cancelled' }
  if (review.state === 'blocked' && typeof review.reason === 'string') {
    return { state: 'blocked', reason: review.reason }
  }
  if (
    review.state !== 'review-required' ||
    typeof review.review !== 'string' ||
    !/^model-storage-review:[a-f0-9]{64}$/.test(review.review) ||
    (review.effect !== 'provision-and-select-first-root' &&
      review.effect !== 'reconnect-current-root') ||
    !isRecord(review.location) ||
    typeof review.location.volumeName !== 'string' ||
    typeof review.location.managedFolderName !== 'string' ||
    !isRecord(review.consequences)
  ) {
    return { state: 'unavailable' }
  }
  return {
    state: 'review-required',
    review: review as unknown as ModelLibraryStorageReviewProjection
  }
}
