import { showNativeOpenDialog } from './platform/native-open-dialog'

import { createActiveLibraryHost } from './library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from './library-lifecycle/production-active-library-dependencies'
export { isTrustedLibrarySender } from './trusted-sender'

/** Main composition for the production window; every path comes from dialog adapters. */
export function createProductionActiveLibraryHost(): ReturnType<typeof createActiveLibraryHost> {
  const dependencies = createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => {
      const result = await showNativeOpenDialog({ title: '选择素材库文件夹', buttonLabel: '选择文件夹', properties: ['openDirectory'] })
      return result.canceled || result.filePaths.length !== 1
        ? { kind: 'cancelled' as const }
        : { kind: 'selected' as const, directory: result.filePaths[0] }
    },
    selectLocalFiles: async () => {
      const result = await showNativeOpenDialog({ title: '选择要收录的图片', buttonLabel: '选择图片', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] })
      return result.canceled ? { kind: 'cancelled' as const } : { kind: 'selected' as const, files: result.filePaths.map((filePath) => ({ filePath })) }
    }
  })
  return createActiveLibraryHost(dependencies)
}

/** Test-only selector injection; the caller must validate every supplied path. */
export function createSyntheticActiveLibraryHost(input: {
  libraryDirectory: string
  sourceSelections: readonly (readonly string[])[]
}): ReturnType<typeof createActiveLibraryHost> {
  let selectionIndex = 0
  const dependencies = createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => ({ kind: 'selected' as const, directory: input.libraryDirectory }),
    selectLocalFiles: async () => {
      const selection = input.sourceSelections[Math.min(selectionIndex, input.sourceSelections.length - 1)]
      selectionIndex += 1
      return { kind: 'selected' as const, files: selection.map((filePath) => ({ filePath })) }
    }
  })
  return createActiveLibraryHost(dependencies)
}
