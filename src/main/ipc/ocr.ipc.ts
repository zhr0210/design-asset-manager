import { ipcMain } from 'electron'
import { OcrDependencyService } from '../services/ocr-dependency.service'
import {
  CHANNEL_OCR_CHECK_ENVIRONMENT,
  CHANNEL_OCR_INSTALL_EASYOCR,
  CHANNEL_OCR_CANCEL_INSTALL,
  CHANNEL_OCR_GET_INSTALL_LOG
} from '../../shared/contracts/ocr-dependency.contract'

export function registerOcrIpc() {
  const service = OcrDependencyService.getInstance()

  ipcMain.handle(CHANNEL_OCR_CHECK_ENVIRONMENT, async () => {
    try {
      return await service.checkEnvironment()
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_CHECK_ENVIRONMENT} failed:`, err)
      throw err
    }
  })

  ipcMain.handle(CHANNEL_OCR_INSTALL_EASYOCR, async (event) => {
    try {
      await service.installEasyOcr(event.sender)
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_INSTALL_EASYOCR} failed:`, err)
      throw err
    }
  })

  ipcMain.handle('ocr:install-compressed-tensors', async (event) => {
    try {
      await service.installCompressedTensors(event.sender)
    } catch (err) {
      console.error(`[IPC] ocr:install-compressed-tensors failed:`, err)
      throw err
    }
  })

  ipcMain.handle(CHANNEL_OCR_CANCEL_INSTALL, async () => {
    try {
      service.cancelInstall()
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_CANCEL_INSTALL} failed:`, err)
      throw err
    }
  })

  ipcMain.handle(CHANNEL_OCR_GET_INSTALL_LOG, async () => {
    try {
      return service.getInstallLog()
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_GET_INSTALL_LOG} failed:`, err)
      throw err
    }
  })
}
