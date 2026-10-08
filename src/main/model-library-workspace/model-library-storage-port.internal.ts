import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  prepareModelStorageRoot,
  type PreparedModelStorageRoot
} from
  '../model-library/model-storage-authority.internal'
import {
  openModelStorageRootRegistryControl,
  type ModelStorageRootRegistryControlReview
} from '../model-library/model-storage-root-registry.internal'
import type {
  ModelStorageRootRegistryError,
  ModelStorageRootRegistrySummary
} from
  '../model-library/model-storage-root-registry.tracer'
import type {
  ModelLibraryStoragePort,
  ModelStorageLocationDisplay,
  ModelStoragePortConfirmation,
  ModelStoragePortReview,
  ModelStoragePortResult,
  ModelStorageSummary
} from './model-library-workspace'

const MANAGED_FOLDER_NAME = 'Design Asset Manager Model Library'

export interface ModelStorageLocationAdapter {
  select(source: 'recommended' | 'choose-parent'): Promise<
    | { readonly kind: 'cancelled' }
    | {
        readonly kind: 'selected'
        readonly parentDirectory: string
        readonly display: ModelStorageLocationDisplay
      }
  >
}

export interface CreateModelLibraryStoragePortInput {
  readonly controlDirectory: string
  readonly location: ModelStorageLocationAdapter
  readonly createStorageIdentity: () => string
}

type PendingCandidate =
  | {
      readonly kind: 'provision-first-root'
      readonly parentDirectory: string
      readonly parentDevice: bigint
      readonly parentInode: bigint
      readonly rootDirectory: string
      readonly plannedStorageIdentity: string
      readonly display: ModelStorageLocationDisplay
    }
  | {
      readonly kind: 'registry-review'
      readonly rootDirectory: string
      readonly display: ModelStorageLocationDisplay
      readonly review: ModelStorageRootRegistryControlReview['review']
    }

export async function createModelLibraryStoragePort(
  input: CreateModelLibraryStoragePortInput
): Promise<ModelLibraryStoragePort> {
  const registry = await openModelStorageRootRegistryControl(
    path.resolve(input.controlDirectory)
  )
  const pending = new WeakMap<object, PendingCandidate>()

  const reviewExistingRoot = async (
    rootDirectory: string,
    display: ModelStorageLocationDisplay
  ): Promise<ModelStoragePortResult<ModelStoragePortReview>> => {
    const reviewed = await registry.review(rootDirectory)
    if (!reviewed.ok) return mapRegistryControlFailure(reviewed.error)
    if (reviewed.value.state === 'blocked') {
      return storagePortSuccess({
        state: 'blocked',
        reason: reviewed.value.reason === 'MIGRATION_REQUIRED'
          ? 'MIGRATION_REQUIRED'
          : 'STORAGE_UNAVAILABLE'
      })
    }
    const candidate = Object.freeze({})
    pending.set(candidate, {
      kind: 'registry-review',
      rootDirectory,
      display,
      review: reviewed.value.review
    })
    return storagePortSuccess({
      state: 'review-required',
      candidate,
      effect: reviewed.value.effect === 'select-first-root'
        ? 'provision-and-select-first-root'
        : 'reconnect-current-root',
      location: display
    })
  }

  return Object.freeze({
    async summarize(): Promise<ModelStoragePortResult<ModelStorageSummary>> {
      const summary = await registry.observeCurrent()
      if (!summary.ok) return mapRegistryControlFailure(summary.error)
      if (summary.value.current.state === 'not-configured') {
        return storagePortSuccess({ state: 'not-configured' })
      }
      return storagePortSuccess(projectConfiguredStorage(summary.value, null))
    },

    async reviewLocation(
      source: 'recommended' | 'choose-parent'
    ): Promise<ModelStoragePortResult<ModelStoragePortReview>> {
      const selected = await input.location.select(source)
      if (selected.kind === 'cancelled') {
        return storagePortSuccess({ state: 'cancelled' })
      }
      const parentDirectory = path.resolve(selected.parentDirectory)
      const parentStat = await fs.lstat(parentDirectory, { bigint: true })
      if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
        return storagePortSuccess({
          state: 'blocked',
          reason: 'STORAGE_UNAVAILABLE'
        })
      }
      const registrySummary = await registry.summarize()
      if (!registrySummary.ok) return mapRegistryControlFailure(
        registrySummary.error
      )

      if (registrySummary.value.current.state === 'configured') {
        const locatorLeaf = await registry.currentLocatorLeaf()
        if (!locatorLeaf.ok || !locatorLeaf.value) {
          return storagePortSuccess({
            state: 'blocked',
            reason: 'STORAGE_UNAVAILABLE'
          })
        }
        return reviewExistingRoot(
          path.join(parentDirectory, locatorLeaf.value),
          selected.display
        )
      }

      const existingCandidates = (await fs.readdir(parentDirectory, {
        withFileTypes: true
      })).filter((entry) =>
        entry.isDirectory() &&
        /^Design Asset Manager Model Library-[a-f0-9]{16}$/.test(entry.name)
      )
      const usableExisting: string[] = []
      for (const entry of existingCandidates) {
        const candidatePath = path.join(parentDirectory, entry.name)
        const candidateReview = await registry.review(candidatePath)
        if (candidateReview.ok && candidateReview.value.state === 'confirmable') {
          usableExisting.push(candidatePath)
        }
      }
      if (usableExisting.length === 1) {
        return reviewExistingRoot(usableExisting[0], selected.display)
      }
      if (usableExisting.length > 1) {
        return storagePortSuccess({
          state: 'blocked',
          reason: 'STORAGE_UNAVAILABLE'
        })
      }

      const rootDirectory = path.join(
        parentDirectory,
        `${MANAGED_FOLDER_NAME}-${randomBytes(8).toString('hex')}`
      )
        const candidate = Object.freeze({})
        pending.set(candidate, {
          kind: 'provision-first-root',
          parentDirectory,
          parentDevice: parentStat.dev,
          parentInode: parentStat.ino,
          rootDirectory,
          plannedStorageIdentity: input.createStorageIdentity(),
          display: selected.display
        })
        return storagePortSuccess({
          state: 'review-required',
          candidate,
          effect: 'provision-and-select-first-root',
          location: selected.display
        })
    },

    async confirmLocation(candidate: object): Promise<ModelStoragePortConfirmation> {
      const reviewed = pending.get(candidate)
      pending.delete(candidate)
      if (!reviewed) return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
      if (reviewed.kind === 'registry-review') {
        return confirmRegistryReview(reviewed)
      }

      let ownedRoot: { readonly device: bigint; readonly inode: bigint } | undefined
      let prepared: PreparedModelStorageRoot | undefined
      let published = false
      try {
        const currentParent = await fs.lstat(reviewed.parentDirectory, {
          bigint: true
        })
        if (
          !currentParent.isDirectory() ||
          currentParent.isSymbolicLink() ||
          currentParent.dev !== reviewed.parentDevice ||
          currentParent.ino !== reviewed.parentInode
        ) {
          return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
        }
        const currentRegistry = await registry.summarize()
        if (
          !currentRegistry.ok ||
          currentRegistry.value.current.state !== 'not-configured'
        ) {
          return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
        }
        if (!await pathIsAbsent(reviewed.rootDirectory)) {
          return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
        }
        await fs.mkdir(reviewed.rootDirectory, { mode: 0o700 })
        const rootStat = await fs.lstat(reviewed.rootDirectory, {
          bigint: true
        })
        if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
          return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
        }
        ownedRoot = { device: rootStat.dev, inode: rootStat.ino }
        const preparation = await prepareModelStorageRoot({
          rootDirectory: reviewed.rootDirectory,
          createStorageIdentity: () => reviewed.plannedStorageIdentity
        })
        if (!preparation.ok) {
          return storageFailure('STORAGE_UNAVAILABLE', 'after-user-action')
        }
        prepared = preparation.value
        const confirmedParent = await fs.lstat(reviewed.parentDirectory, {
          bigint: true
        })
        if (
          !confirmedParent.isDirectory() ||
          confirmedParent.isSymbolicLink() ||
          confirmedParent.dev !== reviewed.parentDevice ||
          confirmedParent.ino !== reviewed.parentInode
        ) {
          return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
        }
        const registryReview = await registry.review(
          reviewed.rootDirectory,
          prepared.root,
          {
            device: prepared.rootDevice,
            inode: prepared.rootInode
          }
        )
        if (!registryReview.ok || registryReview.value.state !== 'confirmable') {
          return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
        }
        const confirmed = await confirmRegistryReview({
          kind: 'registry-review',
          rootDirectory: reviewed.rootDirectory,
          display: reviewed.display,
          review: registryReview.value.review
        })
        if (!confirmed.ok) return confirmed
        prepared.seal()
        published = true
        return confirmed
      } catch {
        return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
      } finally {
        if (!published && ownedRoot) {
          await prepared?.rollbackOwned()
          await removeEmptyOwnedRoot(reviewed.rootDirectory, ownedRoot)
        }
      }
    }
  })

  async function confirmRegistryReview(
    reviewed: Extract<PendingCandidate, { kind: 'registry-review' }>
  ): Promise<ModelStoragePortConfirmation> {
    const confirmed = await registry.confirm(reviewed.review)
    if (confirmed.ok) {
      return {
        ok: true,
        value: projectConfiguredStorage(confirmed.value, reviewed.display)
      }
    }
    if (
      confirmed.error.code === 'SELECTION_REVIEW_REQUIRED' ||
      confirmed.error.code === 'SELECTION_REVIEW_STALE'
    ) {
      return storageFailure('STORAGE_REVIEW_STALE', 'review-again')
    }
    if (confirmed.error.code === 'STORAGE_BUSY') {
      return storageFailure('STORAGE_BUSY', 'after-session-closes')
    }
    return storageFailure('STORAGE_UNAVAILABLE', 'after-user-action')
  }
}

function projectConfiguredStorage(
  summary: ModelStorageRootRegistrySummary,
  location: ModelStorageLocationDisplay | null
): ModelStorageSummary {
  if (summary.current.state === 'not-configured') {
    return { state: 'not-configured' }
  }
  return {
    state: 'configured',
    registration: summary.current.registration,
    condition: summary.current.condition,
    location
  }
}

async function removeEmptyOwnedRoot(
  rootDirectory: string,
  owned: { readonly device: bigint; readonly inode: bigint }
): Promise<void> {
  try {
    const stat = await fs.lstat(rootDirectory, { bigint: true })
    if (
      stat.isDirectory() &&
      !stat.isSymbolicLink() &&
      stat.dev === owned.device &&
      stat.ino === owned.inode &&
      (await fs.readdir(rootDirectory)).length === 0
    ) {
      await fs.rmdir(rootDirectory)
    }
  } catch {
    // Never remove a location whose exact ownership and emptiness are unproven.
  }
}

async function pathIsAbsent(selectedPath: string): Promise<boolean> {
  try {
    await fs.lstat(selectedPath)
    return false
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return true
    throw error
  }
}

function hasErrorCode(value: unknown, code: string): boolean {
  return value !== null &&
    typeof value === 'object' &&
    'code' in value &&
    (value as { readonly code?: unknown }).code === code
}

function storageFailure(
  code: 'STORAGE_REVIEW_STALE' | 'STORAGE_UNAVAILABLE' | 'STORAGE_BUSY',
  retry: 'review-again' | 'after-user-action' | 'after-session-closes'
): Extract<ModelStoragePortConfirmation, { ok: false }> {
  return { ok: false, error: { code, retry } }
}

function storagePortSuccess<T>(value: T): ModelStoragePortResult<T> {
  return { ok: true, value }
}

function mapRegistryControlFailure<T>(
  error: ModelStorageRootRegistryError
): ModelStoragePortResult<T> {
  if (error.code === 'REGISTRY_INTEGRITY_FAILED') {
    return {
      ok: false,
      error: { code: 'REGISTRY_INTEGRITY_FAILED', retry: 'not-retryable' }
    }
  }
  if (error.code === 'REGISTRY_SCHEMA_UNSUPPORTED') {
    return {
      ok: false,
      error: { code: 'REGISTRY_SCHEMA_UNSUPPORTED', retry: 'not-retryable' }
    }
  }
  if (error.code === 'REGISTRY_READ_ONLY') {
    return {
      ok: false,
      error: { code: 'REGISTRY_READ_ONLY', retry: 'after-user-action' }
    }
  }
  if (error.code === 'STORAGE_BUSY') {
    return {
      ok: false,
      error: { code: 'STORAGE_BUSY', retry: 'after-session-closes' }
    }
  }
  return {
    ok: false,
    error: { code: 'STORAGE_UNAVAILABLE', retry: 'after-user-action' }
  }
}
