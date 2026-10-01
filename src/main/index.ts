import {DAM_BUILD_IDENTITY} from '../shared/build-identity.generated'
import {createAcceptanceService} from './ai-acceptance/acceptance-service'
import {createAiHostIdentityStore} from './ai-credentials/host-identity'
import {createSyntheticSecretProtection} from './ai-credentials/synthetic-secret-protection'
import {createAiConnectionService} from './ai-gateway/ai-connection-service'
import {createPiRuntimeHost} from './ai-gateway/pi-runtime-host'
import {createCredentialVault} from './ai-credentials/credential-vault'
import {safeStorage} from 'electron'
import {createBackgroundOcrController} from './background-ocr/background-ocr-controller'
import {createBackgroundAnalysisController} from './background-analysis/background-analysis-controller'
import {sampleBackgroundTelemetry} from './background-analysis/background-telemetry'
import {createTagRecoveryController} from './independent-tags/tag-recovery-controller'
import {createTagBatchController} from './independent-tags/tag-batch-controller'
import {createTagDecisionController} from './independent-tags/tag-decision-controller'
import {createVisualAdmission,type VisualAdmission} from './visual-ai/visual-admission'
import {createTagExecutionController} from './independent-tags/tag-execution-controller'
import {createOcrController} from './ocr/ocr-controller'
import { createTagIntentController } from './independent-tags/tag-intent-controller'
import {createOcrRuntime} from './ocr/ocr-runtime'
import {OCR_CHANGED} from '../shared/contracts/asset-ocr.contract'
import {randomUUID} from 'node:crypto'
import {screen,nativeTheme} from 'electron'
import {createWorkWindowController} from './work-mode/work-window-controller'
import {createElectronWorkWindow} from './work-mode/electron-work-window'
import { createImageToolsController } from './image-tools/image-tools-controller'
import { app, shell, BrowserWindow, ipcMain, protocol, dialog, session } from 'electron'
import { join } from 'path'
import path from 'node:path'
import os from 'node:os'
import fs from 'fs'
import { pathToFileURL,fileURLToPath } from 'url'
import { createAppStorage, type AppStorage } from './app-storage/app-storage'
import { SettingsService } from './services/settings.service'
import { createProductionModelLibraryWorkspaceProvider } from './model-library-workspace/model-library-workspace.composition'
import { DESKTOP_VIEWPORT_POLICY } from '../shared/desktop-viewport-policy'
import { resolveElectronAppLifecyclePolicy } from '../shared/workflows/electron-app-lifecycle.workflow'
import { createElectronMainHostContext } from './electron-main-host-context'
import { createProductionActiveLibraryHost, createSyntheticActiveLibraryHost, isTrustedLibrarySender } from './active-library-runtime'
import { registerMainIpcComposition } from './ipc/main-ipc-composition'
import { ShutdownCoordinator } from './app-shutdown/shutdown-coordinator'
import { configureNativeOpenDialog, showNativeOpenDialog } from './platform/native-open-dialog'
import { createModelLibraryWorkspace } from './model-library-workspace/model-library-workspace'
import type { AppSettings } from '../shared/types/settings.types'
import { createAssetCardController } from './asset-card/asset-card-controller'
import { createElectronAssetCardWindow } from './asset-card/electron-asset-card-window'
import { EVENT_ASSET_CARD_CHANGED, EVENT_ASSET_CARD_RETURN } from '../shared/contracts/asset-card.contract'
import { createVisualAiController } from './visual-ai/visual-ai-controller'
import { EVENT_VISUAL_AI_UPDATED } from '../shared/contracts/visual-ai.contract'
import { createManagedDownloads } from './managed-download/managed-download'
import { DownloadService } from './services/download.service'
import {
  createConnectedLibraryRuntime,readConnectedSyntheticE2eConfiguration,type ConnectedLibraryRuntime
} from './external-connected-library/connected-library-runtime'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'dam-preview',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
  },
  { scheme:'dam-connected-preview',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true} },
  { scheme:'dam-legacy-preview',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true} }
])

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const electronMainHostContext = createElectronMainHostContext()
const trustedRendererEntryUrl = isDev && process.env['ELECTRON_RENDERER_URL']
  ? process.env['ELECTRON_RENDERER_URL']
  : pathToFileURL(join(__dirname, '../renderer/index.html')).toString()
const syntheticE2e = readSyntheticE2eConfiguration()
const connectedSyntheticE2e = readConnectedSyntheticE2eConfiguration({encoded:process.env.DAM_CONNECTED_LIBRARY_SYNTHETIC_E2E,activeRoot:syntheticE2e?.rootDirectory??null,isPackaged:app.isPackaged,requested:process.argv.includes('--dam-active-library-synthetic-e2e')})

if (syntheticE2e) {
  for (const [name, directory] of [
    ['userData', syntheticE2e.profileDirectory],
    ['sessionData', join(syntheticE2e.profileDirectory, 'session')],
    ['logs', join(syntheticE2e.profileDirectory, 'logs')],
    ['crashDumps', join(syntheticE2e.profileDirectory, 'crash-dumps')]
  ] as const) {
    fs.mkdirSync(directory, { recursive: true })
    app.setPath(name, directory)
  }
}

// Keep signed Python sources.
if (!process.env.PYTHONDONTWRITEBYTECODE) {
  process.env.PYTHONDONTWRITEBYTECODE = '1'
}

let mainWindow: BrowserWindow | null = null
let trustedMainFrame: object | null = null
let appStorage: AppStorage | undefined
let activeLibraryHost: ReturnType<typeof createProductionActiveLibraryHost> | undefined
let connectedRuntime: ConnectedLibraryRuntime | undefined
let workWindows:ReturnType<typeof createWorkWindowController>|undefined
let assetCard: ReturnType<typeof createAssetCardController> | undefined
let imageTools: ReturnType<typeof createImageToolsController> | undefined
let backgroundOcr:ReturnType<typeof createBackgroundOcrController>|undefined
let ocr:ReturnType<typeof createOcrController>|undefined
let aiAcceptance:ReturnType<typeof createAcceptanceService>|undefined
let aiConnections:ReturnType<typeof createAiConnectionService>|undefined
let visualAi: ReturnType<typeof createVisualAiController> | undefined
let visualAdmission:VisualAdmission|undefined
let backgroundAnalysis:ReturnType<typeof createBackgroundAnalysisController>|undefined
let tagRecovery:ReturnType<typeof createTagRecoveryController>|undefined
let tagBatches:ReturnType<typeof createTagBatchController>|undefined
let tagDecisions:ReturnType<typeof createTagDecisionController>|undefined
let tagExecution:ReturnType<typeof createTagExecutionController>|undefined
let authorityBusinessRelease:(()=>void)|undefined
let authorityBarrierRelease:(()=>void)|undefined
let tagIntents: ReturnType<typeof createTagIntentController> | undefined
let managedDownloads: ReturnType<typeof createManagedDownloads> | undefined

configureNativeOpenDialog({
  getOwner: () => mainWindow,
  present: (owner, options) => dialog.showOpenDialog(owner, options)
})

function createWindow() {
  const preloadPath = join(__dirname, '../preload/index.cjs')

  const windowInstance = new BrowserWindow({
    width: DESKTOP_VIEWPORT_POLICY.window.defaultWidth,
    height: DESKTOP_VIEWPORT_POLICY.window.defaultHeight,
    minWidth: DESKTOP_VIEWPORT_POLICY.window.minOuterWidth,
    minHeight: DESKTOP_VIEWPORT_POLICY.window.minOuterHeight,
    show: false,
    autoHideMenuBar: true,
    title: syntheticE2e?.interactiveDialogs ? 'DAM · 受控屏幕验收' : 'Design Asset Manager',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 16, y: 14 } } : {}),
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  windowInstance.webContents.on('will-prevent-unload', event => {
    const choice=dialog.showMessageBoxSync(windowInstance,{type:'question',buttons:['继续编辑','放弃未保存内容并离开'],defaultId:0,cancelId:0,message:'存在未保存的编辑内容',detail:'离开会丢弃尚未保存的笔记或描述；已保存的内容和原图不受影响。'})
    if(choice===1)event.preventDefault()
  })
  mainWindow = windowInstance
  if(syntheticE2e?.interactiveDialogs)windowInstance.on('page-title-updated',event=>event.preventDefault())
  windowInstance.on('close',event=>{if(workWindows&&workWindows.count()>0){event.preventDefault();windowInstance.hide()}})
  windowInstance.once('closed', () => { assetCard?.invalidate(); if (mainWindow === windowInstance) { mainWindow = null; trustedMainFrame = null } })
  trustedMainFrame = windowInstance.webContents.mainFrame ?? null

  windowInstance.on('ready-to-show', () => {
    windowInstance.show()
  })

  windowInstance.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    windowInstance.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    windowInstance.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  if (syntheticE2e) {
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (_details, callback) => callback({ cancel: true })
    )
  }
  try {
    appStorage = createAppStorage(join(app.getPath('userData'), 'app-state'))
    activeLibraryHost = syntheticE2e
      ? createSyntheticActiveLibraryHost(syntheticE2e)
      : createProductionActiveLibraryHost()
    appStorage.database.exec('CREATE TABLE IF NOT EXISTS app_device_identity(singleton INTEGER PRIMARY KEY CHECK(singleton=1),identity TEXT NOT NULL)')
    appStorage.database.prepare('INSERT OR IGNORE INTO app_device_identity VALUES(1,?)').run('device:'+randomUUID())
    const deviceId=(appStorage.database.prepare('SELECT identity FROM app_device_identity WHERE singleton=1').get() as {identity:string}).identity
    workWindows=createWorkWindowController({host:activeLibraryHost,deviceId,areas:()=>screen.getAllDisplays().map(d=>d.workArea),theme:()=>nativeTheme.shouldUseDarkColors?'dark':'light',createWindow:input=>createElectronWorkWindow({...input,entryUrl:trustedRendererEntryUrl,preloadPath:join(__dirname,'../preload/work-window.cjs')}),changed:()=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('work-sets:changed')},hideMain:()=>{mainWindow?.hide()},locate:(scope,setId,assetId)=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus();mainWindow.webContents.send('work-sets:locate',{...scope,setId,assetId})}}})
    screen.on('display-removed',()=>{void workWindows?.recover()});screen.on('display-metrics-changed',()=>{void workWindows?.recover()})
    assetCard = createAssetCardController({
      host: activeLibraryHost,
      createWindow: onClosed => createElectronAssetCardWindow({ entryUrl: trustedRendererEntryUrl, preloadPath: join(__dirname, '../preload/asset-card.cjs'), onClosed }),
      returnToWorkspace: (context, configureAi, promptDraft, descriptionDraft) => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        mainWindow.show(); mainWindow.focus()
        mainWindow.webContents.send(EVENT_ASSET_CARD_RETURN, { ...context, configureAi, promptDraft, descriptionDraft })
      },
      onChanged: context => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(EVENT_ASSET_CARD_CHANGED, context) },
      onCardReleased: token => { visualAi?.cancelOwner(`card:${token}`); tagIntents?.cancelOwner(`card:${token}`);tagExecution?.cancelOwner(`card:${token}`);tagDecisions?.cancelOwner(`card:${token}`);tagBatches?.cancelOwner(`card:${token}`);tagRecovery?.cancelOwner(`card:${token}`);backgroundAnalysis?.cancelOwner(`card:${token}`); imageTools?.discardOwner(`card:${token}`) }
    })
    connectedRuntime=await createConnectedLibraryRuntime({userDataDirectory:app.getPath('userData'),synthetic:connectedSyntheticE2e,openConnectedPage:()=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus();void mainWindow.loadURL(`${trustedRendererEntryUrl}#/connected-libraries`)}},requestQuit:()=>app.quit()})
    setupIpcHandlers()
  } catch {
    console.error('[App] Failed to initialize isolated application state.')
  }

  const appLifecyclePolicy = resolveElectronAppLifecyclePolicy(electronMainHostContext.platform)

  if (appLifecyclePolicy.appUserModelId) {
    app.setAppUserModelId(appLifecyclePolicy.appUserModelId)
  }

  app.on('browser-window-created', (_, window) => {
    window.setMenuBarVisibility(false)
  })

  protocol.handle('dam-preview', async (request) => {
    try {
      if (!activeLibraryHost) return new Response('Unavailable', { status: 503 })
      const url = new URL(request.url)
      if (url.host !== 'preview') return previewDenied('url-host')
      if (url.username || url.password) return previewDenied('url-credentials')
      if (url.port) return previewDenied('url-port')
      if (url.search) return previewDenied('url-search')
      const mediaSegments = url.pathname.split('/').filter(Boolean)
      if (mediaSegments.length !== 3) return previewDenied('segment-count')
      const [identity, generation, assetId] = mediaSegments.map(decodeURIComponent)
      const authority = activeLibraryHost.inspect()
      if (!identity || !generation || !assetId || authority.state !== 'ready' || authority.identity !== identity || authority.generation !== generation) return previewDenied('authority')
      const bytes = await activeLibraryHost.readPreview(assetId)
      const after = activeLibraryHost.inspect()
      if (after.state !== 'ready' || after.identity !== identity || after.generation !== generation) return previewDenied('authority-changed')
      return new Response(Buffer.from(bytes), { status: 200, headers: { 'Content-Type': previewMediaType(bytes), 'Cache-Control': 'no-store' } })
    } catch {
      return new Response('Unavailable', { status: 404 })
    }
  })

  connectedRuntime?.registerProtocols(protocol)

  createWindow()

  app.on('activate', function () {
    if(shutdownCoordinator.state!=='idle')return
    if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus()}else if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (resolveElectronAppLifecyclePolicy(electronMainHostContext.platform).quitOnAllWindowsClosed) {
    app.quit()
  }
})

const shutdownCoordinator = new ShutdownCoordinator({
  drain: async () => {
    visualAdmission?.hold();tagDecisions?.invalidate();tagBatches?.invalidate();tagRecovery?.invalidate();aiConnections?.suspendAll();backgroundOcr?.invalidate();backgroundAnalysis?.invalidate();ocr?.suspend()
    await workWindows?.drain()
    await managedDownloads?.drain()
    assetCard?.invalidate()
    activeLibraryHost?.holdBusinessAdmission();await Promise.all([tagBatches?.suspendAndDrain(),visualAi?.suspendAndDrain(),tagExecution?.suspendAndDrain(),ocr?.suspendAndDrain(),backgroundOcr?.suspendAndDrain(),aiConnections?.drain(),aiAcceptance?.drain()]);tagIntents?.invalidate(); imageTools?.invalidate()
    await activeLibraryHost?.close()
    await connectedRuntime?.drain()
    appStorage?.close()
    if (syntheticE2e) fs.writeFileSync(join(syntheticE2e.evidenceDirectory, 'shutdown-complete'), 'complete\n', { flag: 'w' })
  },
  requestQuit: () => app.quit()
})
app.on('before-quit', (event) => {if(workWindows?.hasUnsaved()&&dialog.showMessageBoxSync({type:'question',buttons:['继续编辑','放弃未保存工作集并退出'],defaultId:0,cancelId:0,message:'工作窗口中有未保存的改动。'})===0){event.preventDefault();return}shutdownCoordinator.handleBeforeQuit(event)})

function setupIpcHandlers() {
  ipcMain.handle('app:build-identity',event=>{if(!isTrustedLibrarySender(event,mainWindow,trustedRendererEntryUrl,trustedMainFrame))throw Error('UNTRUSTED_SENDER');return {...DAM_BUILD_IDENTITY,platform:process.platform,arch:process.arch,profileKind:syntheticE2e?'synthetic-isolated':'normal'}})
  if (!appStorage || !activeLibraryHost || !connectedRuntime) throw new Error('Main application state is unavailable.')
  const settingsService = syntheticE2e ? createSyntheticSettingsService(syntheticE2e) : SettingsService.getInstance()
  imageTools = createImageToolsController({ host: activeLibraryHost, onSaved: scope => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('image-tools:saved', scope)
  } })
  visualAdmission=createVisualAdmission()
  aiConnections=createAiConnectionService({hostIdentity:createAiHostIdentityStore(join(app.getPath('userData'),'ai-host-identity.v1.json')),reserveProbe:signal=>visualAdmission!.reservePiProbe(signal),settings:settingsService,vault:createCredentialVault({file:join(app.getPath('userData'),'ai-credentials.v1.json'),protection:syntheticE2e?createSyntheticSecretProtection(app.getPath('userData')):{available:()=>safeStorage.isEncryptionAvailable()&&(process.platform!=='linux'||safeStorage.getSelectedStorageBackend()!=='basic_text'),encrypt:value=>safeStorage.encryptString(value),decrypt:value=>safeStorage.decryptString(value)}}),runtime:createPiRuntimeHost({root:app.isPackaged?join(process.resourcesPath,'pi-runtime'):join(path.dirname(fileURLToPath(import.meta.url)),'../../pi-runtime')}),changed:()=>{visualAi?.invalidate();tagExecution?.invalidate();tagBatches?.invalidate();tagRecovery?.invalidate()}})
  aiAcceptance=createAcceptanceService({directory:join(app.getPath('userData'),'ai-acceptance'),settings:settingsService,connections:aiConnections,admission:visualAdmission,isSynthetic:Boolean(syntheticE2e)})
  visualAi = createVisualAiController({provider:aiConnections.provider, host: activeLibraryHost, admission:visualAdmission, settings: () => settingsService.getSettings(), onChanged: scope => {
    void assetCard?.refresh()
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(EVENT_VISUAL_AI_UPDATED, scope)
  } })
  tagExecution=createTagExecutionController({provider:aiConnections.provider,host:activeLibraryHost,settings:()=>settingsService.getSettings(),admission:visualAdmission,legacy:visualAi,changed:scope=>{void assetCard?.refresh();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(EVENT_VISUAL_AI_UPDATED,scope)}})
  tagBatches=createTagBatchController({host:activeLibraryHost,settings:()=>settingsService.getSettings(),execution:tagExecution,changed:scope=>{void assetCard?.refresh();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(EVENT_VISUAL_AI_UPDATED,scope)}})
  tagRecovery=createTagRecoveryController({host:activeLibraryHost,settings:()=>settingsService.getSettings(),batch:tagBatches,changed:async scope=>{await assetCard?.refresh();await workWindows?.refresh();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(EVENT_VISUAL_AI_UPDATED,scope)}})
  tagDecisions=createTagDecisionController({host:activeLibraryHost,admission:visualAdmission,visuals:{suspendAndDrain:async()=>{tagRecovery?.invalidate();await Promise.all([tagBatches!.suspendAndDrain(),visualAi!.suspendAndDrain(),tagExecution!.suspendAndDrain()])},resume:()=>{visualAi!.resume();tagExecution!.resume();tagBatches!.resume()}},changed:scope=>{void assetCard?.refresh();void workWindows?.refresh();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(EVENT_VISUAL_AI_UPDATED,scope)}})
  tagIntents = createTagIntentController({ host: activeLibraryHost, settings: () => settingsService.getSettings(), changed: scope => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(EVENT_VISUAL_AI_UPDATED, scope)
  } })
  const ocrRuntime=createOcrRuntime({database:appStorage.database,runner:app.isPackaged?join(process.resourcesPath,'ai-service/tools/local_ocr_worker.py'):join(app.getAppPath(),'ai-service/tools/local_ocr_worker.py'),selectRoot:async()=>{
    if(syntheticE2e){const root=process.env.DAM_SYNTHETIC_OCR_RUNTIME;return root&&root.includes('dam-approved-ocr-')?root:null}
    const picked=await showNativeOpenDialog({title:'选择可信的本地 OCR 环境（识别时将运行其中的 Python）',buttonLabel:'选择 OCR 环境',properties:['openDirectory']})
    return picked.canceled?null:picked.filePaths[0]||null
  }})
  ocr=createOcrController({host:activeLibraryHost,runtime:ocrRuntime,runtimeChanged:()=>backgroundOcr?.invalidate(),reserve:(bytes,signal)=>visualAdmission!.reserveOcr(bytes,signal),changed:scope=>{void assetCard?.refresh();void workWindows?.refresh();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(OCR_CHANGED,scope)}})
  backgroundOcr=createBackgroundOcrController({host:activeLibraryHost,ocr,runtime:ocrRuntime,qualify:runtime=>syntheticE2e&&process.env.DAM_SYNTHETIC_BACKGROUND_OCR==='1'?{runtimeFingerprint:runtime.fingerprint,evidenceId:'synthetic-stdlib-only',envelope:{ownership:'host-owned',verified:true,peakRamBytes:768*1048576,accelerator:'cpu',lightOnBattery:false}}:null,telemetry:()=>{
    if(syntheticE2e&&process.env.DAM_SYNTHETIC_BACKGROUND_OCR==='1'){const k=<T>(value:T)=>({kind:'known' as const,value,sampledAt:performance.now()});return{memory:k({free:8*1024**3,total:16*1024**3}),battery:k(false),lowPower:k(false),thermal:k('nominal' as const),idle:k('idle' as const),visible:k(true),gpuFree:{kind:'unknown'}}}
    return sampleBackgroundTelemetry(Boolean(mainWindow&&!mainWindow.isDestroyed()&&mainWindow.isVisible()))
  }})
  managedDownloads = createManagedDownloads({ host: activeLibraryHost, history: new DownloadService(appStorage.database), onImported: job => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('download:imported', { libraryIdentity: job.libraryIdentity, generation: job.generation, assetId: job.assetId })
  } })
  backgroundAnalysis=createBackgroundAnalysisController({host:activeLibraryHost,admission:visualAdmission,telemetry:()=>sampleBackgroundTelemetry(Boolean(mainWindow&&!mainWindow.isDestroyed()&&mainWindow.isVisible())),holdOcr:()=>ocr!.holdForMaintenance(),visuals:{suspendAndDrain:async()=>{tagRecovery?.invalidate();await Promise.all([tagBatches!.suspendAndDrain(),tagExecution!.suspendAndDrain(),visualAi!.suspendAndDrain()])},resume:()=>{tagBatches!.resume();tagExecution!.resume();visualAi!.resume()}}})
  registerMainIpcComposition({
    aiAcceptance,aiConnections,openAuthUrl:url=>shell.openExternal(url),
    appDatabase: appStorage.database,
    settingsService,
    selectSettingsFolder: syntheticE2e ? async () => ({ canceled: true, path: '' }) : async (request) => {
      const result = await showNativeOpenDialog({
        title: '保存位置',
        buttonLabel: '选择文件夹',
        defaultPath: request?.defaultPath,
        properties: ['openDirectory', 'createDirectory']
      })
      return result.canceled || result.filePaths.length === 0
        ? { canceled: true, path: '' }
        : { canceled: false, path: result.filePaths[0] }
    },
    modelLibraryWorkspace: syntheticE2e
      ? { getWorkspace: () => createModelLibraryWorkspace({ officialCatalogReleaseState: 'missing' }) }
      : createProductionModelLibraryWorkspaceProvider(),
    activeLibrary: {
      host: activeLibraryHost,
      onAuthorityWillChange: async () => { if(workWindows?.hasUnsaved()&&dialog.showMessageBoxSync({type:'question',buttons:['继续编辑','放弃工作集草稿并切换'],defaultId:0,cancelId:0,message:'工作窗口有未保存内容。'})===0)throw Error('WORK_DRAFT_RETAINED');authorityBarrierRelease=visualAdmission?.hold();tagDecisions?.invalidate();tagBatches?.invalidate();tagRecovery?.invalidate();aiConnections?.suspend();backgroundOcr?.invalidate();backgroundAnalysis?.invalidate();ocr?.suspend();await workWindows?.drain();await managedDownloads?.drain();authorityBusinessRelease=activeLibraryHost!.holdBusinessAdmission();await Promise.all([tagBatches?.suspendAndDrain(),visualAi?.suspendAndDrain(),tagExecution?.suspendAndDrain(),ocr?.suspendAndDrain(),backgroundOcr?.suspendAndDrain(),aiConnections?.drainInference(),aiAcceptance?.drain()]);tagIntents?.invalidate();imageTools?.invalidate();assetCard?.invalidate() },
      onAuthorityDidChange:async()=>{
        const release=authorityBarrierRelease,businessRelease=authorityBusinessRelease;authorityBarrierRelease=undefined;authorityBusinessRelease=undefined
        if(!release){businessRelease?.();return}
        let ready:{libraryIdentity:string;generation:string}|undefined
        try{const scope=activeLibraryHost!.inspect();if(scope.state==='ready'&&scope.identity&&scope.generation){ready={libraryIdentity:scope.identity,generation:scope.generation};await activeLibraryHost!.readVisualSession(ready);visualAi?.resume();tagExecution?.resume();tagBatches?.resume();if(shutdownCoordinator.state==='idle'){ocr?.resume();aiConnections?.resume();aiAcceptance?.resume()}}}
        finally{businessRelease?.();release();if(shutdownCoordinator.state==='idle'){aiConnections?.resume();aiAcceptance?.resume()}}
        if(ready)try{await tagRecovery?.flush(ready)}catch{/* Reopening remains usable; later refresh can redeliver. */}
      },
      onAssetsChanged: () => { void assetCard?.refresh();void workWindows?.refresh() },
      isTrustedSender: (event) => isTrustedLibrarySender(event, mainWindow, trustedRendererEntryUrl, trustedMainFrame)
    },
    assetCard,
    workWindows,
    visualAi,
    tagIntents,
    tagExecution,
    tagDecisions,
    tagBatches,
    tagRecovery,
    backgroundAnalysis,
    backgroundOcr,
    ocr,
    imageTools,
    managedDownloads,
    externalConnectedLibrary:{
      host:connectedRuntime.connected,
      legacy:connectedRuntime.legacy,
      isTrustedSender:(event)=>isTrustedLibrarySender(event,mainWindow,trustedRendererEntryUrl,trustedMainFrame)
    },
    handle: (channel, handler) => ipcMain.handle(channel, handler as any)
  })
}

function previewDenied(reason: string): Response {
  return new Response('Forbidden', {
    status: 403,
    headers: syntheticE2e ? { 'X-DAM-Synthetic-Denial': reason } : undefined
  })
}

interface SyntheticE2eConfiguration {
  rootDirectory: string
  profileDirectory: string
  libraryDirectory: string
  evidenceDirectory: string
  sourceSelections: readonly (readonly string[])[]
  interactiveDialogs?: boolean
}

function readSyntheticE2eConfiguration(): SyntheticE2eConfiguration | null {
  const encoded = process.env.DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E
  const requested = process.argv.includes('--dam-active-library-synthetic-e2e')
  if (!encoded && !requested) return null
  if (!encoded || !requested || app.isPackaged) throw new Error('SYNTHETIC_E2E_NOT_ALLOWED')
  let value: unknown
  try { value = JSON.parse(encoded) } catch { throw new Error('SYNTHETIC_E2E_CONFIG_INVALID') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('SYNTHETIC_E2E_CONFIG_INVALID')
  const record = value as Record<string, unknown>
  const allowed = ['rootDirectory', 'profileDirectory', 'libraryDirectory', 'evidenceDirectory', 'sourceSelections','interactiveDialogs']
  if (!['rootDirectory', 'profileDirectory', 'libraryDirectory', 'evidenceDirectory', 'sourceSelections'].every(key=>key in record)||Object.keys(record).some((key) => !allowed.includes(key))||(record.interactiveDialogs!==undefined&&typeof record.interactiveDialogs!=='boolean')) throw new Error('SYNTHETIC_E2E_CONFIG_INVALID')
  const rootDirectory = requireAbsoluteString(record.rootDirectory)
  const rootRealPath = fs.realpathSync(rootDirectory)
  const tempRealPath = fs.realpathSync(os.tmpdir())
  if (!isInside(tempRealPath, rootRealPath)) throw new Error('SYNTHETIC_E2E_ROOT_INVALID')
  const profileDirectory = requireSyntheticDescendant(record.profileDirectory, rootRealPath)
  const libraryDirectory = requireSyntheticDescendant(record.libraryDirectory, rootRealPath)
  const evidenceDirectory = requireSyntheticDescendant(record.evidenceDirectory, rootRealPath)
  if (!Array.isArray(record.sourceSelections) || record.sourceSelections.length === 0 || record.sourceSelections.some((selection) => !Array.isArray(selection) || selection.length === 0)) throw new Error('SYNTHETIC_E2E_CONFIG_INVALID')
  const sourceSelections = record.sourceSelections.map((selection) => (selection as unknown[]).map((entry) => {
      const filePath = requireSyntheticDescendant(entry, rootRealPath)
      const stat = fs.lstatSync(filePath)
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('SYNTHETIC_E2E_SOURCE_INVALID')
      return filePath
    }))
  fs.mkdirSync(evidenceDirectory, { recursive: true })
  return Object.freeze({ rootDirectory: rootRealPath, profileDirectory, libraryDirectory, evidenceDirectory, sourceSelections,...(record.interactiveDialogs===true?{interactiveDialogs:true}:{}) })
}

function requireAbsoluteString(value: unknown): string {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error('SYNTHETIC_E2E_CONFIG_INVALID')
  return path.resolve(value)
}

function requireSyntheticDescendant(value: unknown, root: string): string {
  const candidate = requireAbsoluteString(value)
  if (!isInside(root, candidate)) throw new Error('SYNTHETIC_E2E_SCOPE_INVALID')
  return candidate
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)
}

function createSyntheticSettingsService(configuration: SyntheticE2eConfiguration) {
  let settings: AppSettings = {
    libraryPath: configuration.libraryDirectory,
    concurrency: 1,
    delayInterval: 0,
    saveOriginalUrl: false,
    autoThumbnail: true,
    enableTextColorPalette: false,
    textDetectionProvider: 'none',
    textDetectionTimeoutMs: 1000,
    maxTextBoxes: 0,
    minTextBoxConfidence: 1,
    enableTextColorAnalysis: false,
    textBoxProvider: 'none',
    ocrTimeoutMs: 1000,
    maxTextBoxesPerImage: 0,
    autoInstallAllowed: false,
    modelRootDir: join(configuration.profileDirectory, 'disabled-models'),
    selectedPromptModelId: null,
    selectedPromptModelPath: null,
    aiBackends: [],
    promptReverseTemplates: []
  }
  return Object.freeze({
    getSettings: () => settings,
    saveSettings: (patch: Partial<AppSettings>) => (settings = { ...settings, ...patch })
  })
}

function previewMediaType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | 'application/octet-stream' {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return 'application/octet-stream'
}
