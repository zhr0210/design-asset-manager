import {publicSettings,mergePublicBackends} from '../ai-credentials/public-settings'
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'
import { CHANNEL_SETTINGS_LOAD, CHANNEL_SETTINGS_SAVE } from '../../shared/contracts/settings.contract'
import type { AppSettings } from '../../shared/types/settings.types'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import { isDeepStrictEqual } from 'node:util'
import type { SettingsExpected } from '../../shared/contracts/settings.contract'

export interface SettingsServicePort {
  getSettings(): AppSettings
  saveSettings(settings: Partial<AppSettings>): AppSettings
}

export interface SettingsFolderSelectionPort {
  (request?: { defaultPath?: string }): Promise<{ canceled: boolean; path: string }>
}

export function registerSettingsIpc(
  service: SettingsServicePort,
  selectFolder: SettingsFolderSelectionPort,
  handle: MainIpcHandleRegistrar,
  isTrustedSender:(event:IpcMainInvokeEvent)=>boolean=()=>false,
  onAiChanged?:()=>void
) {

  // Load settings
  handle(CHANNEL_SETTINGS_LOAD, async (_event: IpcMainInvokeEvent) => {
    try {
      if(!isTrustedSender(_event))throw Error('UNTRUSTED_SENDER')
      return publicSettings(service.getSettings())
    } catch (err) {
      console.error('Settings read failed')
      throw err
    }
  })

  // Save settings
  handle(CHANNEL_SETTINGS_SAVE, async (_event: IpcMainInvokeEvent, newSettings: Partial<AppSettings>, expected?: SettingsExpected) => {
    try {
      if(!isTrustedSender(_event))throw Error('UNTRUSTED_SENDER')
      if(!newSettings||typeof newSettings!=='object')throw Error('INVALID_SETTINGS')
      if (expected !== undefined) {
        if (!expected || typeof expected !== 'object' || Array.isArray(expected)) throw Error('INVALID_SETTINGS_BASELINE')
        const current = publicSettings(service.getSettings())
        for (const key of Object.keys(newSettings) as Array<keyof AppSettings>) {
          if (!Object.hasOwn(expected, key) || !isDeepStrictEqual(current[key] ?? null, expected[key] ?? null)) throw Error('SETTINGS_CONFLICT: 设置已在另一界面变化，输入仍保留。请重新核对后保存。')
        }
      }
      if(newSettings.aiTaskModels){for(const[task,choice]of Object.entries(newSettings.aiTaskModels)){if(!['analyze','reverse','tags'].includes(task)||!choice||typeof choice.backendId!=='string'||typeof choice.model!=='string'||choice.model.length>256)throw Error('INVALID_MODEL_ASSIGNMENT')}}
      if(newSettings.aiBackends){newSettings={...newSettings,aiBackends:mergePublicBackends(service.getSettings().aiBackends??[],newSettings.aiBackends)}}
      const saved=service.saveSettings(newSettings);if(newSettings.aiBackends||newSettings.aiTaskModels)onAiChanged?.();return publicSettings(saved)
    } catch (err) {
      console.error('Settings write failed')
      throw err
    }
  })

  handle('settings:select-folder', async (_event: IpcMainInvokeEvent, request?: { defaultPath?: string }) => {if(!isTrustedSender(_event))throw Error('UNTRUSTED_SENDER');return selectFolder(request)})
}
