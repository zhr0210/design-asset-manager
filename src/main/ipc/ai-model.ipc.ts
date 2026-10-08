import { ipcMain } from 'electron'
import { PROMPT_VLM_MODELS, getModelLocalPath } from '../services/ai-models/ai-model-registry'
import fs from 'fs'
import path from 'path'
import {
  blockLegacyModelMutation,
  noActiveLegacyModelTransfer
} from '../services/ai-models/legacy-model-mutation.policy'

export function registerAiModelIpc() {
  ipcMain.handle('ai-model:list', async () => {
    return PROMPT_VLM_MODELS.map((model) => {
      const localPath = getModelLocalPath(model)
      const isDownloaded = fs.existsSync(localPath) && fs.existsSync(path.join(localPath, 'config.json'))
      return {
        ...model,
        localPath,
        isDownloaded
      }
    })
  })

  ipcMain.handle('ai-model:download', blockLegacyModelMutation)

  ipcMain.handle('ai-model:cancel-download', noActiveLegacyModelTransfer)

  ipcMain.handle('ai-model:delete', blockLegacyModelMutation)

  ipcMain.handle('ai-model:verify-compatibility', blockLegacyModelMutation)
}
