import { showNativeOpenDialog } from './platform/native-open-dialog'
import fs from 'node:fs'
import path from 'node:path'

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
  interactiveDialogs?: boolean
  rootDirectory?: string
}): ReturnType<typeof createActiveLibraryHost> {
  let selectionIndex = 0
  const dependencies = createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => {
      if (!input.interactiveDialogs) return { kind: 'selected' as const, directory: input.libraryDirectory }
      const result=await showNativeOpenDialog({title:'受控验收：选择测试资料库文件夹',defaultPath:input.rootDirectory,buttonLabel:'选择测试文件夹',properties:['openDirectory','createDirectory']})
      if(result.canceled||result.filePaths.length!==1)return {kind:'cancelled' as const}
      return {kind:'selected' as const,directory:ownedPath(result.filePaths[0])}
    },
    selectLocalFiles: async () => {
      if(input.interactiveDialogs){const result=await showNativeOpenDialog({title:'受控验收：选择生成测试图片',defaultPath:input.rootDirectory,buttonLabel:'选择测试图片',properties:['openFile','multiSelections'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']}]});return result.canceled?{kind:'cancelled' as const}:{kind:'selected' as const,files:result.filePaths.map(value=>({filePath:ownedPath(value)}))}}
      const selection = input.sourceSelections[Math.min(selectionIndex, input.sourceSelections.length - 1)]
      selectionIndex += 1
      return { kind: 'selected' as const, files: selection.map((filePath) => ({ filePath })) }
    }
  })
  return createActiveLibraryHost(dependencies)
  function ownedPath(value:string){const root=input.rootDirectory&&fs.realpathSync(input.rootDirectory),selected=fs.realpathSync(value);if(!root||selected===root||!selected.startsWith(root+path.sep)||fs.lstatSync(value).isSymbolicLink())throw Error('SYNTHETIC_SELECTION_OUTSIDE_ROOT');return selected}
}
