import {registerAiAcceptanceIpc} from './ai-acceptance.ipc'
import type {createAcceptanceService} from '../ai-acceptance/acceptance-service'
import {registerAiConnectionIpc} from './ai-connection.ipc'
import type {AiConnectionService} from '../ai-gateway/ai-connection-service'
import {registerBackgroundOcrIpc} from './background-ocr.ipc'
import type {createBackgroundOcrController} from '../background-ocr/background-ocr-controller'
import {registerBackgroundAnalysisIpc} from './background-analysis.ipc'
import type {createBackgroundAnalysisController} from '../background-analysis/background-analysis-controller'
import {registerTagRecoveryIpc} from './tag-recovery.ipc'
import type {createTagRecoveryController} from '../independent-tags/tag-recovery-controller'
import {registerTagBatchIpc} from './tag-batch.ipc'
import type {createTagBatchController} from '../independent-tags/tag-batch-controller'
import {registerTagDecisionIpc} from './tag-decision.ipc'
import type {createTagDecisionController} from '../independent-tags/tag-decision-controller'
import {registerTagExecutionIpc} from './tag-execution.ipc'
import type {createTagExecutionController} from '../independent-tags/tag-execution-controller'
import {registerAssetOcrIpc} from './asset-ocr.ipc'
import { registerTagIntentIpc } from './independent-tag-intent.ipc'
import type { createTagIntentController } from '../independent-tags/tag-intent-controller'
import type {createOcrController} from '../ocr/ocr-controller'
import * as WorkChannels from '../../shared/contracts/work-set.contract'
import {registerWorkSetIpc} from './work-set.ipc'
import type {createWorkWindowController} from '../work-mode/work-window-controller'
import { registerImageToolsIpc } from './image-tools.ipc'
import type { createImageToolsController } from '../image-tools/image-tools-controller'
import type Database from 'better-sqlite3'
import { registerActiveLibraryIpc, type ActiveLibraryIpcDependencies } from './active-library.ipc'
import { registerDisabledAppIpc } from './disabled-app.ipc'
import { registerDownloadIpc } from './download.ipc'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import { registerSettingsIpc, type SettingsFolderSelectionPort, type SettingsServicePort } from './settings.ipc'
import { registerModelLibraryWorkspaceIpc } from './model-library-workspace.ipc'
import type { CreateModelLibraryWorkspaceIpcHandlersInput } from './model-library-workspace.handlers'
import { registerExternalConnectedLibraryIpc } from './external-connected-library.ipc'
import type { ExternalConnectedLibrary, LegacyReadOnlyWorkspace } from '../../shared/contracts/external-connected-library.contract'
import { registerAiBackendIpc } from './ai-backend.ipc'
import { registerAssetCardIpc } from './asset-card.ipc'
import type { createAssetCardController } from '../asset-card/asset-card-controller'
import { CHANNEL_ASSET_CARD_OPEN, CHANNEL_ASSET_CARD_INSPECT, CHANNEL_ASSET_CARD_ACTION, CHANNEL_ASSET_CARD_DRAFT } from '../../shared/contracts/asset-card.contract'
import { registerVisualAiIpc } from './visual-ai.ipc'
import type { createVisualAiController } from '../visual-ai/visual-ai-controller'
import type { createManagedDownloads } from '../managed-download/managed-download'

export interface MainIpcCompositionDependencies {
  aiAcceptance?:ReturnType<typeof createAcceptanceService>;aiConnections?:AiConnectionService
  openAuthUrl?:(url:string)=>Promise<void>
  appDatabase: Database.Database
  settingsService: SettingsServicePort
  selectSettingsFolder: SettingsFolderSelectionPort
  modelLibraryWorkspace: CreateModelLibraryWorkspaceIpcHandlersInput
  activeLibrary: ActiveLibraryIpcDependencies
  workWindows?:ReturnType<typeof createWorkWindowController>
  assetCard?: ReturnType<typeof createAssetCardController>
  imageTools?: ReturnType<typeof createImageToolsController>
  ocr?:ReturnType<typeof createOcrController>
  visualAi?: ReturnType<typeof createVisualAiController>
  backgroundOcr?:ReturnType<typeof createBackgroundOcrController>
  backgroundAnalysis?:ReturnType<typeof createBackgroundAnalysisController>
  tagRecovery?:ReturnType<typeof createTagRecoveryController>
  tagBatches?:ReturnType<typeof createTagBatchController>
  tagDecisions?:ReturnType<typeof createTagDecisionController>
  tagExecution?:ReturnType<typeof createTagExecutionController>
  tagIntents?: ReturnType<typeof createTagIntentController>
  managedDownloads?: ReturnType<typeof createManagedDownloads>
  externalConnectedLibrary?: {
    host: ExternalConnectedLibrary
    legacy: LegacyReadOnlyWorkspace
    isTrustedSender(event: import('electron').IpcMainInvokeEvent): boolean
  }
  handle: MainIpcHandleRegistrar
}

/** Registers the production Main invoke/event surface exactly once per channel. */
export function registerMainIpcComposition(dependencies: MainIpcCompositionDependencies): void {
  if(dependencies.workWindows)registerWorkSetIpc({controller:dependencies.workWindows,handle:dependencies.handle,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true})
  else for(const channel of [WorkChannels.WORK_SET_READ,WorkChannels.WORK_SET_WRITE,WorkChannels.WORK_WINDOW_OPEN,WorkChannels.WORK_WINDOW_RESTORE,WorkChannels.WORK_WINDOW_RECOVER,WorkChannels.WORK_WINDOW_HIDE_MAIN,WorkChannels.WORK_WINDOW_INSPECT,WorkChannels.WORK_WINDOW_ACTION,WorkChannels.WORK_WINDOW_NOTE_READ,WorkChannels.WORK_WINDOW_NOTE_SAVE])dependencies.handle(channel,()=>({success:false,error:'工作窗口服务不可用。'}))
  registerDownloadIpc(dependencies.appDatabase, dependencies.handle, dependencies.managedDownloads, event => dependencies.activeLibrary.isTrustedSender?.(event) === true)
  registerSettingsIpc(dependencies.settingsService, dependencies.selectSettingsFolder, dependencies.handle,event=>dependencies.activeLibrary.isTrustedSender?.(event)===true,()=>dependencies.aiConnections?.configurationChanged())
  if(dependencies.aiAcceptance)registerAiAcceptanceIpc({service:dependencies.aiAcceptance,handle:dependencies.handle,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true})
  if(dependencies.aiConnections)registerAiConnectionIpc({service:dependencies.aiConnections,handle:dependencies.handle,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true,openAuthUrl:dependencies.openAuthUrl})
  registerAiBackendIpc({connections:dependencies.aiConnections,onChanged:()=>dependencies.aiConnections?.configurationChanged(), settings: dependencies.settingsService, handle: dependencies.handle, isTrustedSender: event => dependencies.activeLibrary.isTrustedSender?.(event) === true })
  registerModelLibraryWorkspaceIpc(dependencies.modelLibraryWorkspace, dependencies.handle)
  registerDisabledAppIpc(dependencies.handle)
  registerActiveLibraryIpc(dependencies.activeLibrary, dependencies.handle)
  registerImageToolsIpc({ controller: dependencies.imageTools, card: dependencies.assetCard, isMain: event => dependencies.activeLibrary.isTrustedSender?.(event) === true, handle: dependencies.handle })
  registerAssetOcrIpc({controller:dependencies.ocr,handle:dependencies.handle,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true})
  registerVisualAiIpc({ controller: dependencies.visualAi, card: dependencies.assetCard, isMain: event => dependencies.activeLibrary.isTrustedSender?.(event) === true, handle: dependencies.handle })
  registerBackgroundOcrIpc({controller:dependencies.backgroundOcr,handle:dependencies.handle,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true})
  registerBackgroundAnalysisIpc({onMutate:()=>dependencies.backgroundOcr?.changed(),controller:dependencies.backgroundAnalysis,card:dependencies.assetCard,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true,handle:dependencies.handle})
  registerTagRecoveryIpc({controller:dependencies.tagRecovery,card:dependencies.assetCard,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true,handle:dependencies.handle})
  registerTagBatchIpc({controller:dependencies.tagBatches,card:dependencies.assetCard,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true,handle:dependencies.handle})
  registerTagDecisionIpc({controller:dependencies.tagDecisions,card:dependencies.assetCard,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true,handle:dependencies.handle})
  registerTagExecutionIpc({controller:dependencies.tagExecution,card:dependencies.assetCard,isMain:event=>dependencies.activeLibrary.isTrustedSender?.(event)===true,handle:dependencies.handle})
  registerTagIntentIpc({ controller: dependencies.tagIntents, card: dependencies.assetCard, isMain: event => dependencies.activeLibrary.isTrustedSender?.(event) === true, handle: dependencies.handle })
  if (dependencies.assetCard) registerAssetCardIpc({ card: dependencies.assetCard, handle: dependencies.handle, isMainSender: event => dependencies.activeLibrary.isTrustedSender?.(event) === true })
  else for (const channel of [CHANNEL_ASSET_CARD_OPEN, CHANNEL_ASSET_CARD_INSPECT, CHANNEL_ASSET_CARD_ACTION, CHANNEL_ASSET_CARD_DRAFT]) dependencies.handle(channel, () => ({ ok: false, code: 'CARD_UNAVAILABLE' }))
  if (dependencies.externalConnectedLibrary) registerExternalConnectedLibraryIpc(dependencies.externalConnectedLibrary, dependencies.handle)
}
