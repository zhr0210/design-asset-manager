import type {
  ModelLibraryWorkspaceConfigureStorageRequest,
  ModelLibraryWorkspaceSummaryRequest
} from '../../shared/contracts/model-library-workspace.contract'
import type {
  ModelLibraryStorageRequest,
  ModelLibraryWorkspace
} from '../model-library-workspace/model-library-workspace'

export interface ModelLibraryWorkspaceIpcHandlers {
  summarize(senderId: string | number, request: unknown): Promise<unknown>
  configureStorage(senderId: string | number, request: unknown): Promise<unknown>
}

export interface CreateModelLibraryWorkspaceIpcHandlersInput {
  readonly getWorkspace: (senderId: string | number) => ModelLibraryWorkspace
}

export function createModelLibraryWorkspaceIpcHandlers(
  input: CreateModelLibraryWorkspaceIpcHandlersInput
): ModelLibraryWorkspaceIpcHandlers {
  return Object.freeze({
    async summarize(senderId: string | number, request: unknown): Promise<unknown> {
      const parsed = parseSummaryRequest(request)
      if (!parsed) return invalidRequest()
      try {
        const workspace = input.getWorkspace(senderId)
        return parsed.kind === 'page'
          ? await workspace.summarize({ kind: 'page' })
          : await workspace.summarize({ kind: 'ai-console' })
      } catch {
        return moduleUnavailable()
      }
    },
    async configureStorage(senderId: string | number, request: unknown): Promise<unknown> {
      const parsed = parseConfigureStorageRequest(request)
      if (!parsed) return invalidRequest()
      try {
        return await input.getWorkspace(senderId).configureStorage(
          parsed as ModelLibraryStorageRequest
        )
      } catch {
        return moduleUnavailable()
      }
    }
  })
}

function parseSummaryRequest(
  value: unknown
): ModelLibraryWorkspaceSummaryRequest | undefined {
  const record = readExactRecord(value, ['kind'])
  if (!record) return undefined
  return record.kind === 'page' || record.kind === 'ai-console'
    ? { kind: record.kind }
    : undefined
}

function parseConfigureStorageRequest(
  value: unknown
): ModelLibraryWorkspaceConfigureStorageRequest | undefined {
  const kindRecord = readRecord(value)
  if (!kindRecord || typeof kindRecord.kind !== 'string') return undefined
  if (
    kindRecord.kind === 'review-recommended-location' ||
    kindRecord.kind === 'review-chosen-parent'
  ) {
    const record = readExactRecord(value, ['kind'])
    return record?.kind === kindRecord.kind
      ? { kind: kindRecord.kind }
      : undefined
  }
  if (kindRecord.kind !== 'confirm-reviewed-selection') return undefined
  const record = readExactRecord(value, ['kind', 'review', 'decision'])
  if (
    !record ||
    record.kind !== 'confirm-reviewed-selection' ||
    typeof record.review !== 'string' ||
    !/^model-storage-review:[a-f0-9]{64}$/.test(record.review) ||
    record.decision !== 'use-reviewed-model-storage-root'
  ) return undefined
  return {
    kind: 'confirm-reviewed-selection',
    review: record.review,
    decision: 'use-reviewed-model-storage-root'
  }
}

function readExactRecord(
  value: unknown,
  expectedKeys: readonly string[]
): Record<string, unknown> | undefined {
  const record = readRecord(value)
  if (!record) return undefined
  const keys = Object.keys(record).sort(compareText)
  const expected = [...expectedKeys].sort(compareText)
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
    ? record
    : undefined
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return undefined
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === 'symbol')) {
    return undefined
  }
  const entries: Array<[string, unknown]> = []
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !('value' in descriptor)) return undefined
    entries.push([key, descriptor.value])
  }
  return Object.fromEntries(entries)
}

function invalidRequest() {
  return {
    ok: false as const,
    error: {
      code: 'INVALID_REQUEST' as const,
      retry: 'not-retryable' as const
    }
  }
}

function moduleUnavailable() {
  return {
    ok: false as const,
    error: {
      code: 'MODULE_UNAVAILABLE' as const,
      retry: 'not-retryable' as const
    }
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
