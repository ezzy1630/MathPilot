import type { CourseFocus } from './types'

export interface AppSettings {
  profileName: string
  currentFocus: CourseFocus
  advancedModeDefault: boolean
  notificationsDefault: boolean
  rawHomeworkImageRetention: 'delete_by_default' | 'keep'
  aiBackend: 'codex_cli' | 'manual_packet'
  manualPromptPacketFallback: boolean
  reports: 'on_demand_only' | 'weekly'
}

export interface TrustedSource {
  id: string
  name: string
  domain: string
  trust: number
}

export interface SourcesConfig {
  trustedSources: string[]
  policy: string
  dynamicSearch?: {
    provider: string
    urlTemplate: string
    trustedChannelHint?: string
  }
}

import appSettingsJson from '@config/app_settings.json'
import sourcesJson from '@config/sources.json'

const DEFAULT_SETTINGS: AppSettings = {
  profileName: 'Student',
  currentFocus: 'Calculus 1',
  advancedModeDefault: false,
  notificationsDefault: false,
  rawHomeworkImageRetention: 'delete_by_default',
  aiBackend: 'codex_cli',
  manualPromptPacketFallback: true,
  reports: 'on_demand_only',
}

let cachedSettings: AppSettings | null = null
let cachedSources: SourcesConfig | null = null

export async function loadAppSettings(): Promise<AppSettings> {
  if (cachedSettings) return cachedSettings
  cachedSettings = { ...DEFAULT_SETTINGS, ...(appSettingsJson as AppSettings) }
  return cachedSettings
}

export async function loadSourcesConfig(): Promise<SourcesConfig> {
  if (cachedSources) return cachedSources
  cachedSources = (sourcesJson as SourcesConfig) ?? { trustedSources: [], policy: 'Prefer trusted calculus sources.' }
  return cachedSources
}

export function clearConfigCache() {
  cachedSettings = null
  cachedSources = null
}
