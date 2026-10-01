import {mergePublicBackends} from '../../ai-credentials/public-settings'
import { SettingsService, createDefaultLlamaBackendConfig } from '../settings.service'
import type { AiBackendConfig } from '../../../shared/types/ai-backend.types'
import type { SettingsServicePort } from '../../ipc/settings.ipc'

export class AiBackendSettingsService {
  constructor(private readonly settingsService: SettingsServicePort = SettingsService.getInstance()) {}

  public listBackends(): AiBackendConfig[] {
    const settings = this.settingsService.getSettings()
    const backends = settings.aiBackends && settings.aiBackends.length > 0
      ? settings.aiBackends.map(backend => ({ ...backend, capabilities: { ...backend.capabilities } }))
      : [createDefaultLlamaBackendConfig()]

    return backends.sort((a, b) => a.priority - b.priority)
  }

  public getBackend(id: string): AiBackendConfig | null {
    return this.listBackends().find((backend) => backend.id === id) ?? null
  }

  public saveBackend(config: AiBackendConfig): AiBackendConfig[] {
    const backends = this.listBackends()
    const index = backends.findIndex((backend) => backend.id === config.id)
    const next = index >= 0
      ? backends.map((backend) => (backend.id === config.id ? config : backend))
      : [...backends, config]

    const merged=mergePublicBackends(backends,next)
    this.settingsService.saveSettings({ aiBackends: merged })
    return merged.sort((a, b) => a.priority - b.priority)
  }

  public deleteBackend(id: string): AiBackendConfig[] {
    const next = this.listBackends().filter((backend) => backend.id !== id)
    const normalized = next.length > 0 ? next : [createDefaultLlamaBackendConfig()]
    this.settingsService.saveSettings({ aiBackends: normalized })
    return normalized.sort((a, b) => a.priority - b.priority)
  }
}
