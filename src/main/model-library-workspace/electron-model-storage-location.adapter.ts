import { showNativeOpenDialog } from '../platform/native-open-dialog'

import type { ModelStorageLocationAdapter } from
  './model-library-storage-port.internal'

export function createElectronModelStorageLocationAdapter(
  recommendedParentDirectory: string
): ModelStorageLocationAdapter {
  return Object.freeze({
    async select(source: 'recommended' | 'choose-parent') {
      if (source === 'recommended') {
        return {
          kind: 'selected' as const,
          parentDirectory: recommendedParentDirectory,
          display: {
            volumeName: '应用推荐位置',
            managedFolderName: 'Design Asset Manager Model Library' as const
          }
        }
      }
      const selected = await showNativeOpenDialog({
        title: '选择模型库保存位置',
        buttonLabel: '选择文件夹',
        properties: ['openDirectory', 'createDirectory']
      })
      if (selected.canceled || selected.filePaths.length !== 1) {
        return { kind: 'cancelled' as const }
      }
      return {
        kind: 'selected' as const,
        parentDirectory: selected.filePaths[0],
        display: {
          volumeName: '用户选择的位置',
          managedFolderName: 'Design Asset Manager Model Library' as const
        }
      }
    }
  })
}
