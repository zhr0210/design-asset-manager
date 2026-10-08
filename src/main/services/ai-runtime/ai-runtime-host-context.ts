import os from 'os'
import type { PlatformArch, PlatformName } from '../../../shared/types/platform.types'

export interface AiRuntimeHostContextInput {
  platform?: PlatformName
  arch?: PlatformArch
  homeDir?: string
}

export interface AiRuntimeHostContext {
  platform: PlatformName
  arch: PlatformArch
  homeDir: string
}

export function createAiRuntimeHostContext(input: AiRuntimeHostContextInput = {}): AiRuntimeHostContext {
  return {
    platform: input.platform ?? process.platform as PlatformName,
    arch: input.arch ?? process.arch as PlatformArch,
    homeDir: input.homeDir ?? os.homedir()
  }
}
