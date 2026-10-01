import { ipcMain } from 'electron'
import fs from 'fs'
import { COOPERATIVE_MODELS, getCooperativeModelLocalPath } from '../services/ai-models/cooperative-model-registry'
import {
  blockLegacyModelMutation,
  noActiveLegacyModelTransfer
} from '../services/ai-models/legacy-model-mutation.policy'

export function registerCooperativeModelIpc() {
  ipcMain.handle('cooperative-model:list', async () => {
    return {
      success: true,
      models: COOPERATIVE_MODELS.map((model) => {
        const localPath = getCooperativeModelLocalPath(model)
        let isDownloaded = false
        try {
          isDownloaded = fs.existsSync(localPath) && fs.readdirSync(localPath).length > 0
        } catch { /* ignore */ }
        return { ...model, localPath, isDownloaded }
      })
    }
  })

  ipcMain.handle('cooperative-model:download', blockLegacyModelMutation)

  ipcMain.handle('cooperative-model:cancel-download', noActiveLegacyModelTransfer)

  ipcMain.handle('cooperative-model:delete', blockLegacyModelMutation)
}
