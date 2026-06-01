import { ipcMain } from 'electron'
import { OcrHealthcheckService } from '../services/ocr-healthcheck.service'
import { CHANNEL_OCR_HEALTHCHECK_RUN } from '../../shared/contracts/ocr-healthcheck.contract'

export function registerOcrHealthcheckIpc() {
  const service = new OcrHealthcheckService()

  ipcMain.handle(CHANNEL_OCR_HEALTHCHECK_RUN, async () => {
    try {
      console.log(`[IPC] Received OCR healthcheck invoke request: ${CHANNEL_OCR_HEALTHCHECK_RUN}`)
      return await service.checkTextOcrProviders()
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_HEALTHCHECK_RUN} error:`, err)
      return {
        ok: false,
        status: 'OCR_HEALTHCHECK_IPC_ERROR',
        error: String(err),
        warnings: []
      }
    }
  })
}
