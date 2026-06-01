import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { SettingsService } from '../services/settings.service'
import { LlamaRuntimeInstallService } from '../services/llama-runtime/llama-runtime-install.service'
import {
  CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL,
  CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN,
  CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE,
  CHANNEL_LLAMA_RUNTIME_GET_STATUS,
  CHANNEL_LLAMA_RUNTIME_START_INSTALL,
  CHANNEL_LLAMA_RUNTIME_START_SERVER,
  CHANNEL_LLAMA_RUNTIME_STOP_SERVER,
  CHANNEL_LLAMA_RUNTIME_TEST_SERVER
} from '../../shared/contracts/llama-runtime.contract'
import type {
  LlamaCreateInstallPlanRequest,
  LlamaServerControlRequest,
  LlamaStartInstallRequest
} from '../../shared/contracts/llama-runtime.contract'

export function registerLlamaRuntimeIpc() {
  const service = LlamaRuntimeInstallService.getInstance()

  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE, async () => {
    return service.detectHardware()
  })

  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN, async (_, request?: LlamaCreateInstallPlanRequest) => {
    return service.createInstallPlan(request?.mirrorManifestPath, request?.modelRootDir, request?.downloadSource)
  })

  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_START_INSTALL, async (event, request: LlamaStartInstallRequest) => {
    return service.startInstall(request.plan, event.sender)
  })

  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL, async () => {
    return service.cancelInstall()
  })

  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_GET_STATUS, async () => {
    return service.getStatus()
  })

  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_START_SERVER, async (_, request?: LlamaServerControlRequest) => {
    return service.startServer(request?.plan, request?.modelPath)
  })

  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_STOP_SERVER, async () => {
    return service.stopServer()
  })

  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_TEST_SERVER, async (_, request?: LlamaServerControlRequest) => {
    return service.testServer(request?.baseUrl)
  })

  ipcMain.handle('llama-runtime:open-install-root', async () => {
    await service.openInstallRoot()
    return { success: true }
  })

  ipcMain.handle('llama-runtime:list-local-models', async () => {
    const modelRootDir = SettingsService.getInstance().getSettings().modelRootDir
      || path.join(app.getPath('userData'), 'AIModels')
    const installRoot = path.join(modelRootDir, 'llama-runtime')
    const { QWEN3_VL_GGUF_CANDIDATES } = await import('../services/llama-runtime/llama-runtime-planner')
    
    console.log('[llama-runtime:list-local-models] Using modelRootDir:', modelRootDir)
    console.log('[llama-runtime:list-local-models] Using installRoot:', installRoot)
    
    return QWEN3_VL_GGUF_CANDIDATES.map((model) => {
      const modelPath = path.join(installRoot, 'models', 'gguf', model.id, model.filename)
      const mmprojPath = model.mmprojFilename 
        ? path.join(installRoot, 'models', 'gguf', model.id, model.mmprojFilename) 
        : ''
      
      const ggufExists = fs.existsSync(modelPath)
      const mmprojExists = mmprojPath ? fs.existsSync(mmprojPath) : true
      // Visual reverse prompts require BOTH the GGUF LLM model and its companion mmproj vision model (if model is multi-modal) to be present on disk
      const isDownloaded = ggufExists && mmprojExists
      
      console.log(`[llama-runtime:list-local-models] Candidate model: ${model.id}`)
      console.log(`  GGUF path: ${modelPath} (Exists: ${ggufExists})`)
      console.log(`  mmproj path: ${mmprojPath || 'None'} (Exists: ${mmprojExists})`)
      console.log(`  Final isDownloaded: ${isDownloaded}`)
      
      return {
        ...model,
        modelPath,
        isDownloaded
      }
    })
  })
}
