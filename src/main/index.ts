import {DAM_BUILD_IDENTITY} from '../shared/build-identity.generated'
import {workMediaResponse} from './work-mode/media-response'
import {createAiDiagnostics,measureAiStage} from './local-ai-resources/ai-diagnostics'
import { createLocalDamServer } from './local-host/local-dam-server'
import { clientRequestScope, isBrowserContext, type MainInvokeContext } from './local-host/client-context'
import { createFileSelection } from './local-host/file-selection'
import { createCommandReceiptAuthority } from './local-host/command-receipts'
import { disabledAppChannels } from './ipc/disabled-app.ipc'
import type { MainIpcHandler } from './ipc/ipc-registrar'
import {createAcceptanceService} from './ai-acceptance/acceptance-service'
import {createAiHostIdentityStore} from './ai-credentials/host-identity'
import {createSyntheticSecretProtection} from './ai-credentials/synthetic-secret-protection'
import { createSyntheticSettingsService, requireSyntheticCommand } from './local-host/synthetic-profile'
import { createWorkspaceDrafts } from './local-host/workspace-drafts'
import { createWorkspaceTransitions } from './local-host/workspace-transitions'
import { createWorkspaceLaunch } from './local-host/workspace-launch'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { WorkspaceDraftScope } from '../shared/contracts/workspace-draft.contract'
import {createAiConnectionService} from './ai-gateway/ai-connection-service'
import {createPiRuntimeHost} from './ai-gateway/pi-runtime-host'
import {readSyntheticFixtures} from './local-host/synthetic-fixtures'
import {createCredentialVault} from './ai-credentials/credential-vault'
import {safeStorage} from 'electron'
import {createBackgroundOcrController} from './background-ocr/background-ocr-controller'
import {createBackgroundAnalysisController} from './background-analysis/background-analysis-controller'
import {createBasicAnalysisController} from './background-analysis/basic-analysis-controller'
import {sampleBackgroundTelemetry} from './background-analysis/background-telemetry'
import {createTagRecoveryController} from './independent-tags/tag-recovery-controller'
import {createTagBatchController} from './independent-tags/tag-batch-controller'
import {createTagDecisionController} from './independent-tags/tag-decision-controller'
import {createVisualAdmission,type VisualAdmission} from './visual-ai/visual-admission'
import {createLocalAiDeviceSampler} from './local-ai-resources/device-sampler'
import {createTagExecutionController} from './independent-tags/tag-execution-controller'
import {createOcrController} from './ocr/ocr-controller'
import { createTagIntentController } from './independent-tags/tag-intent-controller'
import {createOcrRuntime} from './ocr/ocr-runtime'
import {createManagedVisionRuntime,MANAGED_VISION_ID} from './services/ai-runtime/managed-vision-runtime'
import {createPublicModelFetch} from './model-library-workspace/electron-public-model-network'
import {createManagedModelLibrary,type ManagedModelLibrary} from './model-library-workspace/managed-model-library'
import {createManagedGgufPackages,assertNativeRuntimeUrl} from './services/ai-runtime/managed-gguf-packages'
import {parseManagedModelAction} from '../shared/contracts/managed-model-library.contract'
import {createRetrievalModelLibrary,type RetrievalModelLibrary} from './retrieval-workspace/retrieval-model-library'
import {createRetrievalRuntime,type RetrievalRuntime} from './retrieval-workspace/retrieval-runtime'
import {parseRetrievalModelAction,parseRetrievalGeneration,parseAssetSemanticSearch,type RetrievalScope} from '../shared/contracts/retrieval-workspace.contract'
import {createQueryFileGrants,type QueryFileGrants} from './retrieval-workspace/query-file-grants'
import {OCR_CHANGED, OCR_RUNTIME_CHANGED} from '../shared/contracts/asset-ocr.contract'
import {randomUUID} from 'node:crypto'
import {screen,nativeTheme} from 'electron'
import {createWorkWindowController} from './work-mode/work-window-controller'
import {createWindowsVideoRuntime} from './work-mode/windows-video-runtime'
import {createWorkFileHandoffs} from './work-mode/work-file-handoff'
import {createWorkMediaController} from './work-mode/work-media-controller'
import {createElectronWorkWindow} from './work-mode/electron-work-window'
import { createImageToolsController } from './image-tools/image-tools-controller'
import { app, shell, BrowserWindow, ipcMain, protocol, dialog, session, powerMonitor, net } from 'electron'
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
import { createLibraryQuiescence } from './library-quiescence'
import { configureNativeOpenDialog, configureProductOpenDialog, showNativeOpenDialog } from './platform/native-open-dialog'
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
  {scheme:'dam-workmedia',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}},
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
const syntheticFixtures = syntheticE2e ? readSyntheticFixtures(syntheticE2e.rootDirectory) : undefined
const connectedSyntheticE2e = readConnectedSyntheticE2eConfiguration({encoded:process.env.DAM_CONNECTED_LIBRARY_SYNTHETIC_E2E,activeRoot:syntheticE2e?.rootDirectory??null,isPackaged:app.isPackaged,requested:process.argv.includes('--dam-active-library-synthetic-e2e')})

const profileArguments = process.argv.filter(argument => argument.startsWith('--dam-profile='))
if (profileArguments.length > 1 || (syntheticE2e && profileArguments.length)) throw Error('PROFILE_ARGUMENT_INVALID')
const requestedProfile = profileArguments[0]?.slice('--dam-profile='.length)
if (requestedProfile) {
  if (!path.isAbsolute(requestedProfile)) throw Error('PROFILE_ARGUMENT_INVALID')
  for (const [name, directory] of [
    ['userData', requestedProfile], ['sessionData', join(requestedProfile, 'session')],
    ['logs', join(requestedProfile, 'logs')], ['crashDumps', join(requestedProfile, 'crash-dumps')]
  ] as const) { fs.mkdirSync(directory, { recursive: true }); app.setPath(name, directory) }
}

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

const browserEntryRequested = process.argv.includes('--dam-browser')
const ownsSingleHost = app.requestSingleInstanceLock()
if (!ownsSingleHost) app.quit()

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
let workMedia:ReturnType<typeof createWorkMediaController>|undefined
let assetCard: ReturnType<typeof createAssetCardController> | undefined
let imageTools: ReturnType<typeof createImageToolsController> | undefined
let backgroundOcr:ReturnType<typeof createBackgroundOcrController>|undefined
let ocr:ReturnType<typeof createOcrController>|undefined
let managedVision:ReturnType<typeof createManagedVisionRuntime>|undefined
let aiDiagnostics:ReturnType<typeof createAiDiagnostics>|undefined
let managedModels:ManagedModelLibrary|undefined
let retrievalModels:RetrievalModelLibrary|undefined
let retrievalRuntime:RetrievalRuntime|undefined
let queryFileGrants:QueryFileGrants|undefined
let aiDeviceSampler:ReturnType<typeof createLocalAiDeviceSampler>|undefined
let aiAcceptance:ReturnType<typeof createAcceptanceService>|undefined
let aiConnections:ReturnType<typeof createAiConnectionService>|undefined
let visualAi: ReturnType<typeof createVisualAiController> | undefined
let visualAdmission:VisualAdmission|undefined
let backgroundAnalysis:ReturnType<typeof createBackgroundAnalysisController>|undefined
let basicAnalysis:ReturnType<typeof createBasicAnalysisController>|undefined
let tagRecovery:ReturnType<typeof createTagRecoveryController>|undefined
let tagBatches:ReturnType<typeof createTagBatchController>|undefined
let tagDecisions:ReturnType<typeof createTagDecisionController>|undefined
let tagExecution:ReturnType<typeof createTagExecutionController>|undefined
let tagIntents: ReturnType<typeof createTagIntentController> | undefined
let managedDownloads: ReturnType<typeof createManagedDownloads> | undefined
let localServer: Awaited<ReturnType<typeof createLocalDamServer>> | undefined
let workspaceDrafts: ReturnType<typeof createWorkspaceDrafts> | undefined
const draftOwner = (context: MainInvokeContext) => isBrowserContext(context) ? `client:${context.id}` : `native:${context.sender.id}`
const transitionExecution = new AsyncLocalStorage<boolean>()
const authorityCommands = new Set(['library:open', 'library:close', 'library:reopen', 'library:create:confirm', 'workspace:quit'])
const workspaceClients = new Map<string, { connected?: boolean; send(channel: string, value: unknown): void }>()
let flushRound: { id: string; waiting: Set<string>; acknowledge(owner: string, ok: boolean, transient: boolean): void } | undefined
let workspaceWindowCloseInProgress = false
let approvedExit = false
function isTrustedParticipant(context: MainInvokeContext): boolean {
  return isTrustedWorkspace(context) || (!isBrowserContext(context) && (workWindows?.isTrusted(context) === true || assetCard?.isTrusted(context) === true))
}
async function flushAllWorkspaceClients(freeze = false): Promise<void> {
  if (flushRound) throw Error('CLIENT_FLUSH_BUSY')
  if ([...workspaceClients.values()].some(client => client.connected === false)) throw Error('另一个界面未回应，暂未切库或退出。请回到该界面检查连接。')
  const waiting = new Set(workspaceClients.keys())
  if (!waiting.size) { await workspaceDrafts?.flush(); return }
  await new Promise<void>((resolve, reject) => {
    const id = `flush:${randomUUID()}`
    const timer = setTimeout(() => { flushRound = undefined; reject(Error('另一个界面未回应，暂未切库或退出。请回到该界面检查连接。')) }, 4000)
    flushRound = { id, waiting, acknowledge(owner, ok, transient) {
      if (!waiting.has(owner)) return
      if (!ok || transient) { clearTimeout(timer); flushRound = undefined; reject(Error(transient ? '另一界面仍有尚未保存的表单或笔记编辑，请先保存或取消编辑。' : '草稿尚未暂存成功，暂未切库或退出。')); return }
      waiting.delete(owner)
      if (!waiting.size) { clearTimeout(timer); flushRound = undefined; resolve() }
    } }
    for (const client of workspaceClients.values()) client.send('workspace:flush', { id, freeze })
  })
  await workspaceDrafts?.flush()
}
const workspaceTransitions = createWorkspaceTransitions({
  flush: flushAllWorkspaceClients,
  snapshot: async () => {
    await workspaceDrafts?.flush()
    const authority = activeLibraryHost?.inspect(), drafts = await workspaceDrafts?.list('transition-review') ?? []
    const accounts = aiConnections?.activeLogins() ?? []
    const nativeDrafts = workWindows?.hasUnsaved() ? 1 : 0
    return { drafts: drafts.length, nativeDrafts, accounts: accounts.length, fingerprint: JSON.stringify([authority?.identity, authority?.generation, workspaceDrafts?.version(), nativeDrafts, accounts]) }
  },
  notify: (owner, frozen = false) => {
    publishWorkspaceEvent('workspace:transition-state', { frozen })
    for (const client of workspaceClients.values()) client.send('workspace:transition-state', { frozen })
    if (owner) workspaceClients.get(owner)?.send('workspace:transition-review', null)
  }
})
const workspaceHandlers = new Map<string, MainIpcHandler>()
const browserDeniedChannels = new Set(['asset-card:inspect', 'asset-card:action', 'work-window:inspect', 'work-window:action', 'work-window:note-read', 'work-window:note-save','work-window:media-read','work-window:media-write','work-window:media-cancel','work-window:file-handoff','work-window:drag-file'])
const nativeDraftChannels = new Set(['drafts:put', 'drafts:remove', 'workspace:ready', 'workspace:flush-ack'])
const nativeCardChannels = new Set([
  'asset-card:inspect', 'asset-card:action', 'tag-decision:prepare', 'tag-decision:confirm', 'tag-decision:discard',
  'tag-execution:prepare', 'tag-execution:discard-review', 'tag-execution:run', 'tag-execution:inspect', 'tag-execution:cancel', 'tag-execution:read',
  'independent-tags:prepare', 'independent-tags:confirm', 'independent-tags:read',
  'visual-ai:backends', 'visual-ai:prepare', 'visual-ai:discard-review', 'visual-ai:run', 'visual-ai:inspect', 'visual-ai:cancel', 'visual-ai:results', 'visual-ai:confirm-tag',
  'image-tools:prepare', 'image-tools:save', 'image-tools:discard', 'tag-batch:prepare', 'tag-batch:run', 'tag-batch:discard', 'tag-batch:inspect', 'tag-batch:cancel',
  'tag-recovery:list', 'tag-recovery:prepare', 'tag-recovery:receipt', 'background-analysis:read', 'background-analysis:change'
])
const receiptAuthority = createCommandReceiptAuthority({ generation: () => { const state = activeLibraryHost?.inspect(); return `${state?.identity}:${state?.generation}` } })
const fileSelection = createFileSelection({
  syntheticRoot: syntheticE2e?.rootDirectory,
  generation: () => { const scope = activeLibraryHost?.inspect(); return `${scope?.identity}:${scope?.generation}` },
  notify: owner => {
    if (owner === 'main') { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('files:requested') }
    else localServer?.publishToClient(owner, 'files:requested', null)
  }
})
function selectionOwner(context: MainInvokeContext): string { return isBrowserContext(context) ? context.id : 'main' }

configureProductOpenDialog(options => {
  const context = clientRequestScope.getStore()
  if (context && !isTrustedWorkspace(context)) throw Error('UNTRUSTED_SELECTION')
  return fileSelection.select(context ? selectionOwner(context) : 'main', options)
})

function isTrustedWorkspace(context: MainInvokeContext): boolean {
  return isBrowserContext(context)
    ? localServer?.isAuthenticated(context) === true
    : isTrustedLibrarySender(context, mainWindow, trustedRendererEntryUrl, trustedMainFrame)
}

async function beforeWorkspaceWindowClose(): Promise<() => void> {
  if (workspaceWindowCloseInProgress || flushRound || workspaceTransitions.busy()) throw Object.assign(Error('请先完成当前窗口或素材库操作，再关闭工作窗口。'), { code: 'WORK_WINDOW_CLOSE_BUSY' })
  workspaceWindowCloseInProgress = true
  const release = () => {
    workspaceWindowCloseInProgress = false
    publishWorkspaceEvent('workspace:transition-state', { frozen: false })
    for (const client of workspaceClients.values()) { try { client.send('workspace:transition-state', { frozen: false }) } catch { /* A returning client reconciles its state. */ } }
  }
  try { await flushAllWorkspaceClients(true); return release } catch {
    release()
    throw Object.assign(Error('未能核对全部界面的未保存内容，工作窗口已保留。请检查连接，保存或取消尚未完成的编辑，再重试。'), { code: 'WORK_WINDOW_CLOSE_REVIEW_FAILED' })
  }
}

function registerWorkspaceCommand(channel: string, handler: MainIpcHandler): void {
  if (workspaceHandlers.has(channel)) throw new Error('DUPLICATE_HOST_COMMAND')
  const invoke: MainIpcHandler = (context, ...args) => {
    if (!isTrustedWorkspace(context)) {
      const nativeAllowed = !isBrowserContext(context) && (
        (nativeDraftChannels.has(channel) && isTrustedParticipant(context)) ||
        (nativeCardChannels.has(channel) && assetCard?.isTrusted(context)) ||
        (channel.startsWith('work-window:') && browserDeniedChannels.has(channel) && workWindows?.isTrusted(context)))
      if (!nativeAllowed) throw Error('UNTRUSTED_SENDER')
    }
    if (shutdownCoordinator.state !== 'idle') throw Error('HOST_SHUTTING_DOWN')
    if (workspaceTransitions.applying() && !transitionExecution.getStore() && !channel.startsWith('workspace:transition-') && !channel.startsWith('files:')) throw Error('正在切换素材库或退出，请稍候。')
    if (syntheticE2e) requireSyntheticCommand(channel, syntheticFixtures)
    if (authorityCommands.has(channel) && !transitionExecution.getStore()) {
      if (workspaceWindowCloseInProgress) throw Error('正在检查工作窗口的未保存内容，请稍候。')
      if (!isTrustedWorkspace(context)) throw Error('UNTRUSTED_SENDER')
      return workspaceTransitions.request(draftOwner(context), channel === 'workspace:quit' ? 'quit' : 'switch-library', () => transitionExecution.run(true, () => Promise.resolve(invoke(context, ...args))))
    }
    return receiptAuthority.execute(isBrowserContext(context) ? `client:${context.id}` : `native:${context.sender.id}`, args,
      () => clientRequestScope.run(context, async () => {
        const query=args[0] as {query?:unknown;queryId?:unknown;mode?:unknown}|undefined
        const text=typeof query?.query==='string'?query.query:''
        const language=query?.mode==='image'?null:/[\p{Script=Han}]/u.test(text)?/[A-Za-z]/.test(text)?'mixed':'zh':/[A-Za-z]/.test(text)?'en':null
        const result = ['asset-search:query','asset-retrieval:query'].includes(channel)
          ?await measureAiStage(aiDiagnostics?.record,typeof query?.queryId==='string'?query.queryId:randomUUID(),'index-query',()=>Promise.resolve(handler(context,...args)),{language})
          :await handler(context, ...args)
        if (['settings:save', 'ai-backend:save', 'ai-backend:delete'].includes(channel)) publishWorkspaceEvent('settings:changed')
        if ((result as { success?: boolean } | null)?.success && ['connected-library:confirm', 'connected-library:index-next', 'connected-library:queue-metadata', 'connected-library:prepare-new', 'connected-library:prepare-file', 'connected-library:queue-lifecycle', 'connected-library:sync', 'connected-library:resolve-conflict', 'connected-library:confirm-cleanup', 'connected-library:disconnect', 'legacy-readonly:confirm', 'legacy-readonly:close'].includes(channel)) publishWorkspaceEvent('connected-library:changed')
        return result
      }), channel)
  }
  workspaceHandlers.set(channel, invoke)
  ipcMain.handle(channel, invoke)
}

function publishWorkspaceEvent(channel: string, payload?: unknown): void {
  try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload) } catch { /* Commit outcome is independent of notification delivery. */ }
  try { localServer?.publish(channel, payload) } catch { /* Reconnect reconciles a fresh snapshot. */ }
}
function publishToWorkspace(owner: string, channel: string, payload: unknown): void {
  try { workspaceClients.get(owner)?.send(channel,payload) } catch { /* The owner can recover its persisted draft. */ }
}

async function openBrowserWorkspace(): Promise<void> {
  if (!localServer) throw Error('LOCAL_HOST_UNAVAILABLE')
  const url = localServer.authorizeLaunch()
  if (syntheticE2e) {
    fs.writeFileSync(join(syntheticE2e.evidenceDirectory, 'local-host.json'), JSON.stringify({ origin: localServer.origin, entry: url, profileKind: 'synthetic-isolated', build: DAM_BUILD_IDENTITY }))
  } else await shell.openExternal(url)
}

const workspaceLaunch = createWorkspaceLaunch({
  initial: browserEntryRequested ? 'browser' : 'desktop',
  canOpen: () => shutdownCoordinator.state === 'idle' && !approvedExit && !workspaceTransitions.applying(),
  openBrowser: openBrowserWorkspace,
  showDesktop: () => {
    if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus() }
    else createWindow()
  },
  presentationFailed: entry => {
    if (entry === 'browser') dialog.showErrorBox('DAM 浏览器版', '本机 DAM 仍在运行。请重新使用‘DAM 浏览器版’入口，或打开桌面版继续操作。')
  }
})
app.on('second-instance', (_event, argv) => {
  void workspaceLaunch.request(argv.includes('--dam-browser') ? 'browser' : 'desktop').catch(() => {})
})

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
  const windowOwner = `native:${windowInstance.webContents.id}`
  workspaceDrafts?.touch(windowOwner)
  windowInstance.once('closed', () => { workspaceClients.delete(windowOwner); workspaceDrafts?.release(windowOwner); assetCard?.invalidate(); if (mainWindow === windowInstance) { mainWindow = null; trustedMainFrame = null } })
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
  // Present the requested native client even if its first background paint is delayed.
  windowInstance.show()
}

app.whenReady().then(async () => {
  if (!ownsSingleHost) return
  if (syntheticE2e) {
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => callback({ cancel: !localServer || new URL(details.url).origin !== localServer.origin })
    )
  }
  try {
    if (!syntheticE2e) SettingsService.configureProfile(app.getPath('userData'), [
      // An older explicitly selected profile may have used the owned-home adapter.
      join(app.getPath('userData'), 'owned-home', 'DesignAssetManager', 'settings.json'),
      ...(!requestedProfile ? [join(os.homedir(), 'DesignAssetManager', 'settings.json')] : [])
    ])
    appStorage = createAppStorage(join(app.getPath('userData'), 'app-state'))
    if(!syntheticE2e)aiDeviceSampler=createLocalAiDeviceSampler()
    visualAdmission = createVisualAdmission({devices:()=>aiDeviceSampler?.read()??[],activity:()=>{const idle=powerMonitor.getSystemIdleState(5);return idle==='idle'?'idle':idle==='active'||idle==='locked'?'active':'unknown'}})
    const videoRuntime=createWindowsVideoRuntime({directory:join(__dirname,'windows-video'),admission:visualAdmission})
    const libraryPlatform = {videoRuntime,admission: visualAdmission,retrievalRuntime:()=>retrievalRuntime, backupBundleDirectory: app.isPackaged
      ? join(process.resourcesPath, 'windows-backup-runtime', 'win32-x64')
      : join(app.getAppPath(), 'build', 'windows-backup-runtime', 'win32-x64')}
    activeLibraryHost = syntheticE2e
      ? createSyntheticActiveLibraryHost(syntheticE2e, libraryPlatform)
      : createProductionActiveLibraryHost(libraryPlatform)
    workspaceDrafts = createWorkspaceDrafts({ directory: join(app.getPath('userData'), 'recovery'), current: () => activeLibraryHost!.inspect() })
    appStorage.database.exec('CREATE TABLE IF NOT EXISTS app_device_identity(singleton INTEGER PRIMARY KEY CHECK(singleton=1),identity TEXT NOT NULL)')
    appStorage.database.prepare('INSERT OR IGNORE INTO app_device_identity VALUES(1,?)').run('device:'+randomUUID())
    const deviceId=(appStorage.database.prepare('SELECT identity FROM app_device_identity WHERE singleton=1').get() as {identity:string}).identity
    const handoffFiles=createWorkFileHandoffs({host:activeLibraryHost,root:join(app.getPath("userData"),"work-file-handoffs"),admission:visualAdmission,open:file=>shell.openPath(file),trash:file=>shell.trashItem(file)})
    workMedia=createWorkMediaController({host:activeLibraryHost,files:handoffFiles,changed:()=>publishWorkspaceEvent("work-sets:changed")})
    workWindows=createWorkWindowController({media:workMedia,host:activeLibraryHost,deviceId,beforeWorkspaceClose:beforeWorkspaceWindowClose,areas:()=>screen.getAllDisplays().map(d=>d.workArea),theme:()=>nativeTheme.shouldUseDarkColors?'dark':'light',createWindow:input=>createElectronWorkWindow({...input,entryUrl:trustedRendererEntryUrl,preloadPath:join(__dirname,'../preload/work-window.cjs')}),changed:()=>{publishWorkspaceEvent('work-sets:changed')},hideMain:()=>{mainWindow?.hide()},locate:(scope,setId,assetId)=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus()}publishWorkspaceEvent('work-sets:locate',{...scope,setId,assetId})}})
    screen.on('display-removed',()=>{void workWindows?.recover()});screen.on('display-metrics-changed',()=>{void workWindows?.recover()})
    assetCard = createAssetCardController({
      host: activeLibraryHost,
      createWindow: onClosed => createElectronAssetCardWindow({ entryUrl: trustedRendererEntryUrl, preloadPath: join(__dirname, '../preload/asset-card.cjs'), onClosed }),
      returnToWorkspace: (context, configureAi, promptDraft, descriptionDraft, owner) => {
        if (owner.startsWith('native:') && mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus() }
        publishToWorkspace(owner, EVENT_ASSET_CARD_RETURN, { ...context, configureAi, promptDraft, descriptionDraft })
      },
      onChanged: (context, owner) => { publishToWorkspace(owner, EVENT_ASSET_CARD_CHANGED, context); if(context.metadataChanged)publishWorkspaceEvent('workspace:changed') },
      onCardReleased: token => { visualAi?.cancelOwner(`card:${token}`); tagIntents?.cancelOwner(`card:${token}`);tagExecution?.cancelOwner(`card:${token}`);tagDecisions?.cancelOwner(`card:${token}`);tagBatches?.cancelOwner(`card:${token}`);tagRecovery?.cancelOwner(`card:${token}`);backgroundAnalysis?.cancelOwner(`card:${token}`);basicAnalysis?.cancelOwner(`card:${token}`); imageTools?.discardOwner(`card:${token}`) }
    })
    connectedRuntime=await createConnectedLibraryRuntime({userDataDirectory:app.getPath('userData'),synthetic:connectedSyntheticE2e,openConnectedPage:()=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus()}publishWorkspaceEvent('workspace:navigate',{path:'/connected-libraries'})},requestQuit:()=>app.quit()})
    setupIpcHandlers()
    localServer = await createLocalDamServer({
      health: () => ({ buildId: DAM_BUILD_IDENTITY.buildId, platform: process.platform, arch: process.arch, version: app.getVersion() }),
      rendererDirectory: join(__dirname, '../renderer'),
      connected: context => { workspaceDrafts?.touch(draftOwner(context)); workspaceClients.set(draftOwner(context), { send: (channel, value) => localServer?.publishToClient(context.id, channel, value) }) },
      disconnected: context => { const client = workspaceClients.get(draftOwner(context)); if (client) client.connected = false },
      revoked: context => { workspaceClients.delete(draftOwner(context)); workspaceDrafts?.release(draftOwner(context)); receiptAuthority.release(draftOwner(context)); fileSelection.revoke(context.id);queryFileGrants?.revoke(draftOwner(context));workMedia?.revoke(draftOwner(context));activeLibraryHost?.cancelSemanticOwner(draftOwner(context)) },
      channels: () => [...workspaceHandlers.keys()].filter(channel => !browserDeniedChannels.has(channel)),
      invoke: async (context, channel, args) => {
        if (!isTrustedWorkspace(context)) throw Error('SESSION_EXPIRED')
        return clientRequestScope.run(context, () => Promise.resolve(workspaceHandlers.get(channel)!(context, ...args)))
      },
      media: async (_context, reference) => {
        if(reference.startsWith('work/')){
          const parts=reference.split('/').map(decodeURIComponent)
          if((parts.length!==5&&parts.length!==6)||parts.some(part=>!/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(part)))throw Error('MEDIA_DENIED')
          const [,libraryIdentity,generation,setId,assetId,frameId]=parts
          return activeLibraryHost!.readWorkMediaFile({libraryIdentity,generation,setId,assetId,...(frameId?{frameId}:{})})
        }
        if(reference.startsWith('handoff/')){const id=decodeURIComponent(reference.slice(8));if(!workMedia)throw Error('MEDIA_DENIED');return workMedia.files.readFile(id)}
        const parts = reference.split('/').map(decodeURIComponent)
        if (parts.length !== 4 || !['active', 'connected', 'legacy'].includes(parts[0]) || parts.some(part => !/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(part))) throw Error('MEDIA_DENIED')
        const [kind, identity, generation, assetId] = parts
        const current = () => {
          if (kind === 'connected') {
            const state = connectedRuntime!.connected.inspect()
            return { identity: state.libraryIdentity, generation: state.generation, available: state.state !== 'unconfigured' }
          }
          const state = kind === 'legacy' ? connectedRuntime!.legacy.inspect() : activeLibraryHost!.inspect()
          return { identity: state.identity, generation: state.generation, available: state.state === 'ready' }
        }
        const check = () => { const state = current(); if (!state.available || state.identity !== identity || state.generation !== generation) throw Error('MEDIA_DENIED') }
        check()
        const bytes = await (kind === 'connected' ? connectedRuntime!.connected.readPreview(assetId) : kind === 'legacy' ? connectedRuntime!.legacy.readPreview(assetId) : activeLibraryHost!.readPreview(assetId))
        check()
        return { bytes, type: previewMediaType(bytes) }
      }
    })
  } catch {
    console.error('[App] Failed to initialize isolated application state.')
    try {
      dialog.showErrorBox('DAM 启动失败', '本机服务未能启动。DAM 将在清理本次启动资源后退出。请重新打开桌面版或浏览器版。')
    } finally {
      approvedExit = true
      app.quit()
    }
    return
  }

  if (!syntheticE2e && localServer) {
    const receipt = { schema: 1, pid: process.pid, origin: localServer.origin, buildId: DAM_BUILD_IDENTITY.buildId,
      platform: process.platform, arch: process.arch, version: app.getVersion() }
    const temporary = join(app.getPath('userData'), 'host-startup.' + randomUUID() + '.tmp')
    try {
      await fs.promises.writeFile(temporary, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 })
      await fs.promises.rename(temporary, join(app.getPath('userData'), 'host-startup.json'))
    } catch {
      await fs.promises.rm(temporary, { force: true }).catch(() => {})
      console.error('[App] Non-sensitive startup receipt unavailable.')
    }
  }

  const appLifecyclePolicy = resolveElectronAppLifecyclePolicy(electronMainHostContext.platform)

  if (appLifecyclePolicy.appUserModelId) {
    app.setAppUserModelId(appLifecyclePolicy.appUserModelId)
  }

  app.on('browser-window-created', (_, window) => {
    window.setMenuBarVisibility(false)
  })

  protocol.handle('dam-workmedia',async request=>{
    try{if(!activeLibraryHost)throw Error();const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
      if(url.host!=='media'||url.search||url.hash||url.username||url.password||url.port||(parts.length!==4&&parts.length!==5))throw Error('MEDIA_DENIED')
      const [libraryIdentity,generation,setId,assetId,frameId]=parts,file=await activeLibraryHost.readWorkMediaFile({libraryIdentity,generation,setId,assetId,...(frameId?{frameId}:{})})
      const result=workMediaResponse(file,request.headers.get('Range'))
      return new Response(request.method==='HEAD'?null:Buffer.from(result.bytes),{status:result.status,headers:result.headers})
    }catch{return new Response('Unavailable',{status:403})}
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

  // A reported client presentation failure must retain the ready Host's recovery entries.
  await workspaceLaunch.ready().catch(() => {})

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0 || (mainWindow && !mainWindow.isDestroyed())) {
      void workspaceLaunch.request('desktop').catch(() => {})
    }
  })
})

// Closing a view detaches it. Only explicit Exit DAM ends the shared Host.
app.on('window-all-closed', () => {})

const libraryQuiescence = createLibraryQuiescence({
  current: () => ({
    visualAdmission, activeLibraryHost, workWindows, managedDownloads, assetCard,
    tagDecisions, tagBatches, tagRecovery, visualAi, tagExecution, tagIntents,
    imageTools, backgroundAnalysis, basicAnalysis, backgroundOcr, ocr, aiConnections, aiAcceptance, managedVision, retrievalRuntime, queryFileGrants
  }),
  isShutdownIdle: () => shutdownCoordinator.state === 'idle',
  confirmSwitchDraftDiscard: () => {
    if (!transitionExecution.getStore() && workWindows?.hasUnsaved()) throw Error('WORK_DRAFT_RETAINED')
  }
})

const shutdownCoordinator = new ShutdownCoordinator({
  drain: async () => {
    fileSelection.cancelAll()
    await workspaceDrafts?.flush()
    await managedModels?.drain()
    await retrievalModels?.drain()
    await libraryQuiescence.drainForShutdown()
    await connectedRuntime?.drain()
    await aiDeviceSampler?.stop()
    await localServer?.close()
    appStorage?.close()
    if (syntheticE2e) fs.writeFileSync(join(syntheticE2e.evidenceDirectory, 'shutdown-complete'), 'complete\n', { flag: 'w' })
  },
  requestQuit: () => app.quit()
})
app.on('before-quit', event => {
  if (!approvedExit && shutdownCoordinator.state === 'idle' && workspaceClients.size > 0) {
    event.preventDefault()
    const mainOwner = mainWindow && !mainWindow.isDestroyed() ? `native:${mainWindow.webContents.id}` : undefined
    const owner = (mainOwner && workspaceClients.has(mainOwner) ? mainOwner : [...workspaceClients.keys()].find(key => key.startsWith('client:')))
    if (owner) {
      mainWindow?.show()
      void workspaceTransitions.request(owner, 'quit', async () => { approvedExit = true; setTimeout(() => app.quit(), 200); return { success: true } }).catch(() => {})
    } else createWindow()
    return
  }
  shutdownCoordinator.handleBeforeQuit(event)
})

function setupIpcHandlers() {
  registerWorkspaceCommand('workspace:ready', (context, request) => {
    if (!isTrustedParticipant(context)) throw Error('UNTRUSTED_SENDER')
    if (!request || Object.keys(request).join() !== 'draftWriterId' || typeof request.draftWriterId !== 'string') throw Error('INVALID_DRAFT_WRITER')
    const owner = draftOwner(context)
    workspaceDrafts?.beginWriter(owner, request.draftWriterId)
    workspaceDrafts?.touch(owner)
    if (isBrowserContext(context)) workspaceClients.set(owner, { send: (channel, value) => localServer?.publishToClient(context.id, channel, value) })
    else if (!workspaceClients.has(owner)) {
      workspaceClients.set(owner, { send: (channel, value) => { if (!context.sender.isDestroyed()) context.sender.send(channel, value) } })
      context.sender.once('destroyed', () => { workspaceClients.delete(owner); workspaceDrafts?.release(owner) })
    }
  })
  registerWorkspaceCommand('workspace:flush-ack', (context, request) => {
    if (!isTrustedParticipant(context) || !request || Object.keys(request).sort().join() !== 'id,ok,transient' || typeof request.ok !== 'boolean' || typeof request.transient !== 'boolean' || request.id !== flushRound?.id) throw Error('UNTRUSTED_FLUSH')
    flushRound?.acknowledge(draftOwner(context), request.ok, request.transient)
  })
  registerWorkspaceCommand('workspace:transition-pending', context => { if (!isTrustedWorkspace(context)) throw Error('UNTRUSTED_SENDER'); return workspaceTransitions.pending(draftOwner(context)) })
  registerWorkspaceCommand('workspace:transition-confirm', (context, id) => { if (!isTrustedWorkspace(context)) throw Error('UNTRUSTED_SENDER'); return workspaceTransitions.confirm(draftOwner(context), id) })
  registerWorkspaceCommand('workspace:transition-cancel', (context, id) => { if (!isTrustedWorkspace(context)) throw Error('UNTRUSTED_SENDER'); return workspaceTransitions.cancel(draftOwner(context), id) })
  registerWorkspaceCommand('workspace:quit', context => { if (!isTrustedWorkspace(context)) throw Error('UNTRUSTED_SENDER'); approvedExit = true; setTimeout(() => app.quit(), 200); return { success: true } })
  for (const name of ['put', 'remove', 'list', 'recover', 'discard'] as const) {
    registerWorkspaceCommand(`drafts:${name}`, async (context, request) => {
      const scope = request as WorkspaceDraftScope
      const card = assetCard?.inspect()
      const nativeGrant = !isBrowserContext(context) && (name === 'put' || name === 'remove') && (workWindows?.permitsDraft(context, scope) || (assetCard?.isTrusted(context) && card && ['description', 'prompt'].includes(scope?.kind) && scope.libraryIdentity === card.context.libraryIdentity && scope.generation === card.context.generation && scope.entityId === card.context.assetId))
      if ((!isTrustedWorkspace(context) && !nativeGrant) || !workspaceDrafts) throw Error('UNTRUSTED_SENDER')
      const owner = draftOwner(context)
      let result: unknown
      if (name === 'put') result = await workspaceDrafts.put(owner, isBrowserContext(context) ? 'browser' : nativeGrant ? 'native' : 'desktop', request)
      else if (name === 'remove') result = await workspaceDrafts.remove(owner, request)
      else if (name === 'list') result = await workspaceDrafts.list(owner)
      else if (name === 'recover') result = await workspaceDrafts.recover(owner, request)
      else result = await workspaceDrafts.discard(owner, request)
      if (name !== 'list') publishWorkspaceEvent('drafts:changed')
      return result
    })
  }
  registerWorkspaceCommand('app:build-identity',event=>{if(!isTrustedWorkspace(event))throw Error('UNTRUSTED_SENDER');return {...DAM_BUILD_IDENTITY,platform:process.platform,arch:process.arch,profileKind:syntheticE2e?'synthetic-isolated':'normal',host:'electron-local'}})
  registerWorkspaceCommand('app:open-browser', async event => { if (!isTrustedWorkspace(event)) throw Error('UNTRUSTED_SENDER'); await workspaceLaunch.request('browser'); return { success: true } })
  registerWorkspaceCommand('app:capabilities', context => {
    if (!isTrustedWorkspace(context)) throw Error('UNTRUSTED_SENDER')
    const disabled = new Set<string>([...disabledAppChannels(), 'assets:delete', 'ai-worker:run-prompt-reverse', 'assets:apply-path-migration-plan'])
    return [...workspaceHandlers.keys()].map(command => ({ command, role: browserDeniedChannels.has(command) ? 'native-window' : 'workspace',
      state: disabled.has(command) ? 'disabled' : 'registered',
      browser: browserDeniedChannels.has(command) ? 'role-restricted' : disabled.has(command) ? 'disabled' : 'registered',
      reason: disabled.has(command) ? '现有正式应用禁用此能力。' : browserDeniedChannels.has(command) ? '只允许对应原生窗口调用。' : null }))
  })
  for (const [name, operation] of Object.entries({ pending: fileSelection.pending, browse: fileSelection.browse, createDirectory: fileSelection.createDirectory, confirm: fileSelection.confirm, cancel: fileSelection.cancel })) {
    registerWorkspaceCommand(`files:${name}`, (context, request) => {
      if (!isTrustedWorkspace(context)) throw Error('UNTRUSTED_SENDER')
      return (operation as (owner: string, request: any) => unknown)(selectionOwner(context), request)
    })
  }
  if (!appStorage || !activeLibraryHost || !connectedRuntime || !visualAdmission) throw new Error('Main application state is unavailable.')
  const settingsService = syntheticE2e ? createSyntheticSettingsService(syntheticE2e, syntheticFixtures) : SettingsService.getInstance()
  aiDiagnostics=createAiDiagnostics(appStorage.database,DAM_BUILD_IDENTITY.buildId)
  appStorage.database.exec('CREATE TABLE IF NOT EXISTS ai_resource_policy(singleton INTEGER PRIMARY KEY CHECK(singleton=1),policy TEXT NOT NULL)')
  const savedResourcePolicy=appStorage.database.prepare('SELECT policy FROM ai_resource_policy WHERE singleton=1').get() as {policy:string}|undefined
  if(savedResourcePolicy)visualAdmission.configureResources(JSON.parse(savedResourcePolicy.policy))
  const selectRuntimePath=async(title:string,directory:boolean)=>{
    const selected=await showNativeOpenDialog({title,properties:directory?['openDirectory']:['openFile'],...(!directory?{filters:[{name:'Python',extensions:process.platform==='win32'?['exe']:['*']}]}:{})})
    return selected.canceled?null:selected.filePaths[0]??null
  }
  if(!syntheticE2e){
    const runner=app.isPackaged?join(process.resourcesPath,'ai-service/tools/managed_vision_worker.py'):join(__dirname,'ai-service/tools/managed_vision_worker.py')
    const selectModel=()=>selectRuntimePath('导入 Qwen3-VL 2B/4B 数据制品文件夹（不执行目录代码）',true)
    const selectPython=()=>selectRuntimePath('选择已安装、可信的 Python（需 Torch 与 Transformers）',false)
    const changed=()=>{aiConnections?.configurationChanged();visualAi?.invalidate();tagExecution?.invalidate();tagBatches?.invalidate();tagRecovery?.invalidate();basicAnalysis?.invalidate();publishWorkspaceEvent('settings:changed')}
    const modelNetwork=session.fromPartition('dam-public-model-download',{cache:false})
    managedModels=createManagedModelLibrary({database:appStorage.database,root:join(app.getPath('userData'),'managed-models'),runner,
      fetch:createPublicModelFetch(options=>net.request({...options,session:modelNetwork})),selectModel,selectPython,
      reserve:(id,signal)=>visualAdmission!.reserveResident('model-acquisition:'+id,128*1024**2,signal),changed:()=>publishWorkspaceEvent('managed-models:changed'),admission:visualAdmission})
    managedVision=createManagedVisionRuntime({database:appStorage.database,settings:settingsService,admission:visualAdmission,
      runner,selectModel,selectPython,changed,models:managedModels,diagnostics:aiDiagnostics.record,
      refreshDevices:()=>aiDeviceSampler?.refresh()??Promise.resolve(),
      ggufPackages:createManagedGgufPackages({database:appStorage.database,root:join(app.getPath('userData'),'managed-gguf-runtime'),
        fetch:createPublicModelFetch(options=>net.request({...options,session:modelNetwork}),assertNativeRuntimeUrl),changed:()=>publishWorkspaceEvent('managed-models:changed')})})
    const retrievalChanged=()=>publishWorkspaceEvent('retrieval-models:changed')
    retrievalModels=createRetrievalModelLibrary({database:appStorage.database,root:join(app.getPath('userData'),'retrieval-models'),
      fetch:createPublicModelFetch(options=>net.request({...options,session:modelNetwork})),admission:visualAdmission,changed:retrievalChanged})
    retrievalRuntime=createRetrievalRuntime({database:appStorage.database,runner:app.isPackaged?join(process.resourcesPath,'ai-service/tools/retrieval_worker.py'):join(__dirname,'ai-service/tools/retrieval_worker.py'),
      models:retrievalModels,admission:visualAdmission,selectPython,changed:retrievalChanged,archiveRoot:join(app.getPath('userData'),'retrieval-runtimes')})
  }
  registerWorkspaceCommand('retrieval-models:read',()=>{if(!retrievalModels||!retrievalRuntime)throw Error('LOCAL_RUNTIME_UNAVAILABLE');return {...retrievalModels.summary(),runtime:retrievalRuntime.status()}})
  registerWorkspaceCommand('retrieval-models:action',async(_context,raw)=>{
    if(!retrievalModels||!retrievalRuntime)throw Error('LOCAL_RUNTIME_UNAVAILABLE')
    const action=parseRetrievalModelAction(raw)
    switch(action.kind){
      case 'review-install':return retrievalModels.reviewInstall()
      case 'confirm-install':return retrievalModels.confirm(action.receipt)
      case 'pause':await retrievalModels.pause(action.taskId);break
      case 'resume':retrievalModels.resume(action.taskId);break
      case 'abandon':await retrievalModels.abandon(action.taskId);break
      case 'select-runtime':await retrievalRuntime.selectRuntime();break
      case 'verify-use':await retrievalRuntime.verifyUse(action.modelId);break
      case 'revoke':await retrievalRuntime.revoke(action.modelId);break
      case 'restore':retrievalModels.trust(action.modelId,true);break
      case 'release-idle':await retrievalRuntime.releaseIdle();break
      case 'cancel-validation':retrievalRuntime.cancelValidation();break
    }
    return {...retrievalModels.summary(),runtime:retrievalRuntime.status()}
  })
  queryFileGrants=createQueryFileGrants({admission:visualAdmission,current:()=>activeLibraryHost!.inspect(),select:async()=>{
    const result=await showNativeOpenDialog({title:'选择一张图片作为检索示例（不收录，不上传）',properties:['openFile'],filters:[{name:'单帧图片 · 最多4MiB',extensions:['png','jpg','jpeg','webp']}]})
    return result.canceled||result.filePaths.length!==1?null:result.filePaths[0]
  }})
  const checkRetrievalScope=(input:unknown):RetrievalScope=>{
    const scope=input as RetrievalScope,current=activeLibraryHost!.inspect()
    if(!scope||typeof scope!=='object'||Array.isArray(scope)||Object.keys(scope).some(k=>!['libraryIdentity','generation'].includes(k))||
      current.state!=='ready'||scope.libraryIdentity!==current.identity||scope.generation!==current.generation)throw Error('RETRIEVAL_SCOPE_EXPIRED')
    return scope
  }
  registerWorkspaceCommand('asset-retrieval:coverage',(_context,input)=>{checkRetrievalScope(input);return activeLibraryHost!.readRetrievalCoverage()})
  registerWorkspaceCommand('asset-retrieval:start',(_context,input)=>activeLibraryHost!.startRetrievalGeneration(parseRetrievalGeneration(input)))
  for(const name of ['pause','resume','switch-space','cancel-query'] as const)registerWorkspaceCommand(`asset-retrieval:${name}`,(context,input)=>{
    if(!input||typeof input!=='object'||Object.keys(input).sort().join(',')!=='generation,id,libraryIdentity'||typeof input.id!=='string')throw Error('RETRIEVAL_ACTION_INVALID')
    const scope=checkRetrievalScope({libraryIdentity:input.libraryIdentity,generation:input.generation})
    if(name==='pause'||name==='resume'){if(!/^retrieval-job:[a-f0-9-]{36}$/.test(input.id))throw Error('RETRIEVAL_ACTION_INVALID');return name==='pause'?activeLibraryHost!.pauseRetrievalGeneration(scope,input.id):activeLibraryHost!.resumeRetrievalGeneration(scope,input.id)}
    if(name==='switch-space'){if(!/^[a-f0-9]{64}$/.test(input.id))throw Error('RETRIEVAL_ACTION_INVALID');return activeLibraryHost!.switchRetrievalSpace(scope,input.id)}
    if(!/^[a-f0-9-]{36}$/.test(input.id))throw Error('RETRIEVAL_ACTION_INVALID');return activeLibraryHost!.cancelSemanticQuery(scope,input.id,draftOwner(context))
  })
  registerWorkspaceCommand('asset-retrieval:rebuild-index',(_context,input)=>{checkRetrievalScope(input);return activeLibraryHost!.rebuildRetrievalIndex()})
  registerWorkspaceCommand('asset-retrieval:query',(context,input)=>{
    const value=parseAssetSemanticSearch(input),owner=draftOwner(context)
    if(value.externalGrant)return queryFileGrants!.use(owner,value,value.externalGrant,bytes=>activeLibraryHost!.searchSemanticPage(value,owner,bytes))
    return activeLibraryHost!.searchSemanticPage(value,owner)
  })
  registerWorkspaceCommand('query-file:select',(context,input)=>queryFileGrants!.select(draftOwner(context),checkRetrievalScope(input)))
  registerWorkspaceCommand('query-file:release',(context,id)=>{if(typeof id!=='string'||!/^query-file:[a-f0-9-]{36}$/.test(id))throw Error('RETRIEVAL_ACTION_INVALID');queryFileGrants!.release(draftOwner(context),id)})
  registerWorkspaceCommand('managed-models:read',context=>{
    if(!isTrustedWorkspace(context)||!managedModels)throw Error('LOCAL_RUNTIME_UNAVAILABLE')
    return managedModels.summary(managedVision?.status().modelEntryId??undefined)
  })
  registerWorkspaceCommand('managed-models:action',async(context,input)=>{
    if(!isTrustedWorkspace(context)||!managedModels||!managedVision)throw Error('LOCAL_RUNTIME_UNAVAILABLE')
    const action=parseManagedModelAction(input)
    switch(action.kind){
      case 'review-import':return managedModels.reviewImport(action.ownership)
      case 'review-install':return managedModels.reviewInstall(action.modelId)
      case 'review-gguf-install':return managedModels.reviewGgufInstall(action.bundleId)
      case 'review-gguf-import':return managedModels.reviewGgufImport(action.bundleId,action.ownership)
      case 'confirm':return managedModels.confirm(action.review)
      case 'discard-review':managedModels.discardReview(action.review);break
      case 'cancel-preparation':managedModels.cancelPreparation();break
      case 'refresh-catalog':await managedModels.refreshCatalog();break
      case 'recommend-gguf':await aiDeviceSampler?.refresh();return managedModels.recommendGguf(action.preference)
      case 'auto-select':await managedVision.autoSelect(action.preference);break
      case 'pause':await managedModels.pause(action.taskId);break
      case 'resume':await managedModels.resume(action.taskId);break
      case 'abandon':await managedModels.abandon(action.taskId);break
      case 'activate':await managedVision.activateModel(action.modelEntryId);break
      case 'activate-gguf':await managedVision.activateModel(action.modelEntryId,{mode:action.mode,deviceId:action.deviceId});break
      case 'revoke':await managedVision.revokeModel(action.modelEntryId);break
      case 'retire':await managedVision.revokeModel(action.modelEntryId,true);break
      case 'restore':managedModels.setTrust(action.modelEntryId,true);break
      case 'refresh-source':try{await managedModels.refreshSource(action.modelEntryId)}finally{await managedVision.sourceTrustChanged(action.modelEntryId)}break
    }
    return managedModels.summary(managedVision.status().modelEntryId??undefined)
  })
  for(const action of ['status','configure','activate','deactivate'] as const)registerWorkspaceCommand(`managed-vision:${action}`,async context=>{
    if(!isTrustedWorkspace(context)||!managedVision)throw Error('LOCAL_RUNTIME_UNAVAILABLE')
    if(action!=='status')await managedVision[action]()
    return managedVision.status()
  })
  registerWorkspaceCommand('ai-resources:read',()=>visualAdmission!.resourceStatus())
  registerWorkspaceCommand('ai-resources:diagnostics',context=>{
    if(!isTrustedWorkspace(context)||!appStorage||!aiDiagnostics)throw Error('AI_RESOURCE_UNAVAILABLE')
    const recoveries=(managedVision?appStorage.database.prepare('SELECT record FROM local_oom_recovery ORDER BY rowid DESC LIMIT 20').all():[]).map(row=>{
      const value=JSON.parse((row as {record:string}).record),safe:Record<string,unknown>={}
      for(const key of ['state','model','operationId','executionId','fromFingerprint','fromMode','toFingerprint','toMode','loadedExecutionId','physicalCalls','errorCode','updatedAt','terminalAt'])if(value[key]!==undefined)safe[key]=value[key]
      return safe
    })
    return {stages:aiDiagnostics.read(),recoveries}
  })
  registerWorkspaceCommand('ai-resources:release-idle',async(context)=>{
    if(!isTrustedWorkspace(context)||!visualAdmission)throw Error('AI_RESOURCE_UNAVAILABLE')
    visualAdmission.releaseIdleMaterials();await Promise.all([managedVision?.releaseIdle(),retrievalRuntime?.releaseIdle()]);return visualAdmission.resourceStatus()
  })
  registerWorkspaceCommand('ai-resources:configure',async(_context,policy)=>{
    visualAdmission!.configureResources(policy)
    appStorage!.database.prepare('INSERT INTO ai_resource_policy VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET policy=excluded.policy').run(JSON.stringify(policy))
    await Promise.all([managedVision?.rebalance(),retrievalRuntime?.rebalance()]);return visualAdmission!.resourceStatus()
  })
  imageTools = createImageToolsController({ host: activeLibraryHost, onSaved: scope => {
    publishWorkspaceEvent('image-tools:saved', scope)
  } })
  aiConnections=createAiConnectionService({hostIdentity:createAiHostIdentityStore(join(app.getPath('userData'),'ai-host-identity.v1.json')),managed:managedVision?{owns:id=>id===MANAGED_VISION_ID,prepare:signal=>managedVision!.prepare(signal),invokeOnce:input=>managedVision!.invokeOnce(input),recoverLocal:(error,input)=>managedVision!.recoverLocal(error,input),finishLocalRecovery:(error,outcome)=>managedVision!.finishLocalRecovery(error,outcome)}:undefined,reserveProbe:signal=>visualAdmission!.reservePiProbe(signal),settings:settingsService,vault:createCredentialVault({file:join(app.getPath('userData'),'ai-credentials.v1.json'),protection:syntheticE2e?createSyntheticSecretProtection(app.getPath('userData')):{available:()=>safeStorage.isEncryptionAvailable()&&(process.platform!=='linux'||safeStorage.getSelectedStorageBackend()!=='basic_text'),encrypt:value=>safeStorage.encryptString(value),decrypt:value=>safeStorage.decryptString(value)}}),runtime:createPiRuntimeHost({authorizeRequest:syntheticE2e?(request=>{if(!syntheticFixtures)throw Error('SYNTHETIC_EXECUTION_DENIED');syntheticFixtures.authorizePi(request)}):undefined,root:app.isPackaged?join(process.resourcesPath,'pi-runtime'):join(path.dirname(fileURLToPath(import.meta.url)),'../../pi-runtime')}),changed:()=>{visualAi?.invalidate();tagExecution?.invalidate();tagBatches?.invalidate();tagRecovery?.invalidate();basicAnalysis?.invalidate()}})
  managedVision?.recheck()
  aiAcceptance=createAcceptanceService({directory:join(app.getPath('userData'),'ai-acceptance'),settings:settingsService,connections:aiConnections,admission:visualAdmission,isSynthetic:Boolean(syntheticE2e)})
  visualAi = createVisualAiController({provider:aiConnections.provider, host: activeLibraryHost, admission:visualAdmission, settings: () => settingsService.getSettings(), onChanged: scope => {
    void assetCard?.refresh()
    publishWorkspaceEvent(EVENT_VISUAL_AI_UPDATED, scope)
  } })
  tagExecution=createTagExecutionController({diagnostics:aiDiagnostics.record,provider:aiConnections.provider,host:activeLibraryHost,settings:()=>settingsService.getSettings(),admission:visualAdmission,legacy:visualAi,changed:scope=>{void assetCard?.refresh();publishWorkspaceEvent(EVENT_VISUAL_AI_UPDATED,scope)}})
  tagBatches=createTagBatchController({host:activeLibraryHost,settings:()=>settingsService.getSettings(),execution:tagExecution,changed:scope=>{void assetCard?.refresh();publishWorkspaceEvent(EVENT_VISUAL_AI_UPDATED,scope)}})
  tagRecovery=createTagRecoveryController({host:activeLibraryHost,settings:()=>settingsService.getSettings(),batch:tagBatches,changed:async scope=>{await assetCard?.refresh();await workWindows?.refresh();publishWorkspaceEvent(EVENT_VISUAL_AI_UPDATED,scope);if(scope.eventId.startsWith('basic:'))publishWorkspaceEvent(OCR_CHANGED,scope)}})
  tagDecisions=createTagDecisionController({host:activeLibraryHost,admission:visualAdmission,visuals:{suspendAndDrain:async()=>{tagRecovery?.invalidate();await Promise.all([tagBatches!.suspendAndDrain(),visualAi!.suspendAndDrain(),tagExecution!.suspendAndDrain()])},resume:()=>{visualAi!.resume();tagExecution!.resume();tagBatches!.resume()}},changed:scope=>{void assetCard?.refresh();void workWindows?.refresh();publishWorkspaceEvent(EVENT_VISUAL_AI_UPDATED,scope)}})
  tagIntents = createTagIntentController({ host: activeLibraryHost, settings: () => settingsService.getSettings(), changed: scope => {
    publishWorkspaceEvent(EVENT_VISUAL_AI_UPDATED, scope)
  } })
  const selectOcrRoot=async()=>{
    const picked=await showNativeOpenDialog({title:'选择可信的本地 OCR 环境（识别时将运行其中的 Python）',buttonLabel:'选择 OCR 环境',properties:['openDirectory']})
    return picked.canceled?null:picked.filePaths[0]||null
  }
  const ocrRuntime = syntheticE2e
    ? syntheticFixtures?.ocrRuntime(syntheticE2e.profileDirectory, selectOcrRoot) ?? {current:async()=>null,configure:async()=>{throw Error('SYNTHETIC_EXECUTION_DENIED')}}
    : createOcrRuntime({database:appStorage.database,runner:app.isPackaged?join(process.resourcesPath,'ai-service/tools/local_ocr_worker.py'):join(__dirname,'ai-service/tools/local_ocr_worker.py'),selectRoot:selectOcrRoot,reserve:(bytes,signal)=>visualAdmission!.reserveOcr(bytes,signal)})
  ocr=createOcrController({host:activeLibraryHost,runtime:ocrRuntime,runtimeChanged:()=>{backgroundOcr?.invalidate();publishWorkspaceEvent(OCR_RUNTIME_CHANGED)},reserve:(bytes,signal,priority)=>visualAdmission!.reserveOcr(bytes,signal,priority),changed:scope=>{void assetCard?.refresh();void workWindows?.refresh();publishWorkspaceEvent(OCR_CHANGED,scope);void tagRecovery?.flush(scope)}})
  backgroundOcr=createBackgroundOcrController({host:activeLibraryHost,ocr,runtime:ocrRuntime,qualify:runtime=>runtime.qualification??(syntheticE2e&&process.env.DAM_SYNTHETIC_BACKGROUND_OCR==='1'?{runtimeFingerprint:runtime.fingerprint,evidenceId:'synthetic-stdlib-only',envelope:{ownership:'host-owned',verified:true,peakRamBytes:768*1048576,accelerator:'cpu',lightOnBattery:false}}:null),telemetry:()=>{
    if(syntheticE2e&&process.env.DAM_SYNTHETIC_BACKGROUND_OCR==='1'){const k=<T>(value:T)=>({kind:'known' as const,value,sampledAt:performance.now()});return{memory:k({free:8*1024**3,total:16*1024**3}),battery:k(false),lowPower:k(false),thermal:k('nominal' as const),idle:k('idle' as const),visible:k(true),gpuFree:{kind:'unknown'}}}
    return sampleBackgroundTelemetry(Boolean(mainWindow&&!mainWindow.isDestroyed()&&mainWindow.isVisible()))
  }})
  managedDownloads = createManagedDownloads({ host: activeLibraryHost, history: new DownloadService(appStorage.database), fetch: syntheticE2e ? syntheticFixtures?.fetch ?? (async()=>{throw Error('SYNTHETIC_ENDPOINT_DENIED')}) : undefined, onImported: job => {
    publishWorkspaceEvent('download:imported', { libraryIdentity: job.libraryIdentity, generation: job.generation, assetId: job.assetId })
  } })
  basicAnalysis=createBasicAnalysisController({diagnostics:aiDiagnostics.record,host:activeLibraryHost,settings:()=>settingsService.getSettings(),provider:aiConnections.provider,admission:visualAdmission,tags:tagExecution,ocr,ocrRuntime,
    resourceReadiness:rule=>rule.backendId===MANAGED_VISION_ID?managedVision?.backgroundReadiness():undefined,
    upgrade:async(input,signal)=>{if((await activeLibraryHost!.readAssetContext([])).schemaVersion>=14)return;const releaseOcr=ocr!.holdForMaintenance(),release=visualAdmission!.hold();try{await backgroundOcr?.suspendAndDrain();await Promise.all([tagBatches!.suspendAndDrain(),tagExecution!.suspendAndDrain(),visualAi!.suspendAndDrain()]);await activeLibraryHost!.enableBasicAnalysis(input,signal)}finally{tagBatches!.resume();tagExecution!.resume();visualAi!.resume();ocr!.resume();releaseOcr();release()}},
    changed:scope=>{void assetCard?.refresh();void workWindows?.refresh();publishWorkspaceEvent(EVENT_VISUAL_AI_UPDATED,scope);publishWorkspaceEvent(OCR_CHANGED,scope);void tagRecovery?.flush(scope)}})
  backgroundAnalysis=createBackgroundAnalysisController({basic:basicAnalysis,flush:scope=>tagRecovery!.flush(scope),host:activeLibraryHost,admission:visualAdmission,telemetry:()=>sampleBackgroundTelemetry(Boolean(mainWindow&&!mainWindow.isDestroyed()&&mainWindow.isVisible())),holdOcr:()=>ocr!.holdForMaintenance(),visuals:{suspendAndDrain:async()=>{tagRecovery?.invalidate();await backgroundOcr?.suspendAndDrain();await Promise.all([basicAnalysis!.suspendAndDrain(),tagBatches!.suspendAndDrain(),tagExecution!.suspendAndDrain(),visualAi!.suspendAndDrain()])},resume:()=>{basicAnalysis!.resume();ocr!.resume();tagBatches!.resume();tagExecution!.resume();visualAi!.resume()}}})
  registerMainIpcComposition({
    aiAcceptance,aiConnections,openAuthUrl:url=>shell.openExternal(url),
    appDatabase: appStorage.database,
    settingsService,
    selectSettingsFolder: syntheticE2e && !syntheticE2e.interactiveDialogs ? async () => ({ canceled: true, path: '' }) : async (request) => {
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
      onAuthorityWillChange: libraryQuiescence.onAuthorityWillChange,
      onAuthorityDidChange: async () => { await libraryQuiescence.onAuthorityDidChange(); publishWorkspaceEvent('workspace:changed', activeLibraryHost?.inspect()) },
      onAssetsChanged: () => { void assetCard?.refresh();void workWindows?.refresh(); publishWorkspaceEvent('workspace:changed', activeLibraryHost?.inspect()) },
      isTrustedSender: isTrustedWorkspace
    },
    assetCard,
    workWindows,
    workMedia,workMediaOwner:draftOwner,
    visualAi,
    tagIntents,
    tagExecution,
    tagDecisions,
    tagBatches,
    tagRecovery,
    backgroundAnalysis,
    basicAnalysis,
    backgroundOcr,
    ocr,
    imageTools,
    managedDownloads,
    externalConnectedLibrary:{
      host:connectedRuntime.connected,
      pairing:connectedRuntime.pairing,
      companionArtifact:connectedRuntime.companionArtifact,
      legacy:connectedRuntime.legacy,
      isTrustedSender:isTrustedWorkspace
    },
    handle: registerWorkspaceCommand
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

function previewMediaType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | 'application/octet-stream' {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return 'application/octet-stream'
}
