export interface ElectronMainHostContext {
  platform: NodeJS.Platform
}

export interface ElectronMainHostContextInput {
  platform?: NodeJS.Platform
}

export function createElectronMainHostContext(input: ElectronMainHostContextInput = {}): ElectronMainHostContext {
  return {
    platform: input.platform ?? process.platform
  }
}
