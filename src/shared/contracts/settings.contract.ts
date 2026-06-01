import type { AppSettings } from '../types/settings.types'

/**
 * ⚙️ 全局设置加载与保存通信契约 (Shared Settings IPC Contracts)
 * 注意: 依据现有 SettingsService 运行时结构，IPC 通道直接返回 AppSettings 实体，非包装结构。
 */

export const CHANNEL_SETTINGS_LOAD = 'settings:load'
export const CHANNEL_SETTINGS_SAVE = 'settings:save'

// DTOs & Types aligned with runtime SettingsService
export type LoadSettingsResponse = AppSettings

export type SaveSettingsRequest = Partial<AppSettings>

export type SaveSettingsResponse = AppSettings
