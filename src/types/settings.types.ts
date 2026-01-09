import type { OutputFormat } from './image.types'

/**
 * Theme options for the application
 */
export type ThemeOption = 'light' | 'dark' | 'system'

/**
 * Settings persistence interface for localStorage
 */
export interface PersistedSettings {
  theme: ThemeOption
  defaultQuality: number
  defaultFormat: OutputFormat
  stripMetadata: boolean
  advancedOptionsExpanded: boolean
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: PersistedSettings = {
  theme: 'system',
  defaultQuality: 70,
  defaultFormat: 'webp',
  stripMetadata: true,
  advancedOptionsExpanded: false,
}
