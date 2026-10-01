import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { app } from 'electron'

import { createElectronModelStorageLocationAdapter } from
  './electron-model-storage-location.adapter'
import {
  createModelLibraryStoragePort
} from './model-library-storage-port.internal'
import type { ModelLibraryStoragePort } from './model-library-workspace'
import type {
  ModelStoragePortConfirmation,
  ModelStoragePortReview,
  ModelStoragePortResult,
  ModelStorageSummary
} from './model-library-workspace'
import {
  createModelLibraryWorkspace,
  type BundledOfficialCatalogPackage,
  type OfficialCatalogPinnedTrustRoot,
  type ModelLibraryWorkspace
} from './model-library-workspace'
import { BUNDLED_OFFICIAL_MODEL_CATALOG } from
  './official-model-catalog.release'
import { PINNED_OFFICIAL_MODEL_CATALOG_TRUST_ROOT } from
  './official-model-catalog.release'
import { OFFICIAL_MODEL_CATALOG_RELEASE_INPUT_STATE } from
  './official-model-catalog.release'

export interface ModelLibraryWorkspaceProvider {
  getWorkspace(senderId: number): ModelLibraryWorkspace
}

export interface CreateModelLibraryWorkspaceProviderInput {
  readonly officialCatalogReleaseState?: 'missing' | 'invalid' | 'candidate'
  readonly pinnedCatalogTrustRoot?: OfficialCatalogPinnedTrustRoot
  readonly bundledCatalog?: BundledOfficialCatalogPackage
  readonly createStorage: () => Promise<ModelLibraryStoragePort>
}

export function createModelLibraryWorkspaceProvider(
  input: CreateModelLibraryWorkspaceProviderInput
): ModelLibraryWorkspaceProvider {
  const workspaces = new Map<number, ModelLibraryWorkspace>()
  const storage = createLazyStoragePort(input.createStorage)
  return Object.freeze({
    getWorkspace(senderId: number): ModelLibraryWorkspace {
      let workspace = workspaces.get(senderId)
      if (!workspace) {
        workspace = createModelLibraryWorkspace({
          officialCatalogReleaseState: input.officialCatalogReleaseState,
          pinnedCatalogTrustRoot: input.pinnedCatalogTrustRoot,
          bundledCatalog: input.bundledCatalog,
          storage
        })
        workspaces.set(senderId, workspace)
      }
      return workspace
    }
  })
}

export function createProductionModelLibraryWorkspaceProvider():
  ModelLibraryWorkspaceProvider {
  const userDataDirectory = app.getPath('userData')
  const controlDirectory = path.join(
    userDataDirectory,
    'model-library-workspace'
  )
  const location = createElectronModelStorageLocationAdapter(userDataDirectory)
  return createModelLibraryWorkspaceProvider({
    officialCatalogReleaseState: OFFICIAL_MODEL_CATALOG_RELEASE_INPUT_STATE,
    pinnedCatalogTrustRoot: PINNED_OFFICIAL_MODEL_CATALOG_TRUST_ROOT,
    bundledCatalog: BUNDLED_OFFICIAL_MODEL_CATALOG,
    async createStorage() {
      await fs.mkdir(controlDirectory, { recursive: true, mode: 0o700 })
      const stat = await fs.lstat(controlDirectory)
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error('MODEL_LIBRARY_WORKSPACE_CONTROL_UNAVAILABLE')
      }
      return createModelLibraryStoragePort({
        controlDirectory,
        location,
        createStorageIdentity: () => `model-storage-root:${randomUUID()}`
      })
    }
  })
}

function createLazyStoragePort(
  createStorage: () => Promise<ModelLibraryStoragePort>
): ModelLibraryStoragePort {
  let storagePromise: Promise<ModelLibraryStoragePort> | undefined
  const getStorage = () => {
    storagePromise ??= createStorage()
    return storagePromise
  }
  return Object.freeze({
    async summarize(): Promise<ModelStoragePortResult<ModelStorageSummary>> {
      return (await getStorage()).summarize()
    },
    async reviewLocation(
      source: 'recommended' | 'choose-parent'
    ): Promise<ModelStoragePortResult<ModelStoragePortReview>> {
      const storage = await getStorage()
      if (!storage.reviewLocation) {
        return { ok: true, value: { state: 'cancelled' as const } }
      }
      return storage.reviewLocation(source)
    },
    async confirmLocation(candidate: object): Promise<ModelStoragePortConfirmation> {
      const storage = await getStorage()
      if (!storage.confirmLocation) {
        return {
          ok: false,
          error: {
            code: 'STORAGE_UNAVAILABLE',
            retry: 'after-user-action'
          }
        }
      }
      return storage.confirmLocation(candidate)
    }
  })
}
