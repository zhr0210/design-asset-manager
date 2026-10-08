import { constants } from 'node:fs'
import { access } from 'node:fs/promises'

import { sanitizeFilename } from '../platform/path-normalizer'

export type LibraryCreationTargetAccess = 'read-write' | 'read-only' | 'unavailable'

export interface LibraryCreationTargetAccessInput {
  readonly directory: string
  readonly targetState: 'missing' | 'empty'
  readonly nodeMode: bigint
}

export interface LibraryCreationTargetPlatformAdapter {
  readonly platform: NodeJS.Platform
  targetNameIsSupported(name: string): boolean
  inspectAccess(input: LibraryCreationTargetAccessInput): Promise<LibraryCreationTargetAccess>
}

/** Host filesystem policy; injected so Library Lifecycle orchestration stays platform-neutral. */
export function createNodeLibraryCreationTargetPlatformAdapter(
  platform: NodeJS.Platform = process.platform
): LibraryCreationTargetPlatformAdapter {
  return Object.freeze({
    platform,
    targetNameIsSupported(name: string): boolean {
      return platform !== 'win32' || sanitizeFilename(name) === name.normalize('NFC')
    },
    async inspectAccess(input: LibraryCreationTargetAccessInput): Promise<LibraryCreationTargetAccess> {
      if (platform !== 'win32' &&
        ((input.nodeMode & 0o222n) === 0n || (input.nodeMode & 0o111n) === 0n)) {
        return 'read-only'
      }
      try {
        await access(input.directory, constants.R_OK | constants.W_OK | constants.X_OK)
        return 'read-write'
      } catch {
        return 'unavailable'
      }
    }
  })
}
