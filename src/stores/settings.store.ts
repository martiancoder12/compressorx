import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OutputFormat, ThemeOption, PersistedSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

/**
 * Settings store state interface
 */
export interface SettingsStoreState extends PersistedSettings {
  setTheme: (theme: ThemeOption) => void
  setDefaultQuality: (quality: number) => void
  setDefaultFormat: (format: OutputFormat) => void
  setStripMetadata: (strip: boolean) => void
  setAdvancedOptionsExpanded: (expanded: boolean) => void
  resetToDefaults: () => void
}

/**
 * Storage key for localStorage persistence
 */
const STORAGE_KEY = 'compressorx-settings'

/**
 * Settings store with localStorage persistence
 * Persists theme, quality, format, and metadata settings
 */
export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      // Initial state from defaults
      ...DEFAULT_SETTINGS,

      setTheme: (theme: ThemeOption) => {
        set({ theme })
      },

      setDefaultQuality: (quality: number) => {
        // Clamp quality to valid range 0-100
        const clampedQuality = Math.max(0, Math.min(100, quality))
        set({ defaultQuality: clampedQuality })
      },

      setDefaultFormat: (format: OutputFormat) => {
        set({ defaultFormat: format })
      },

      setStripMetadata: (strip: boolean) => {
        set({ stripMetadata: strip })
      },

      setAdvancedOptionsExpanded: (expanded: boolean) => {
        set({ advancedOptionsExpanded: expanded })
      },

      resetToDefaults: () => {
        set(DEFAULT_SETTINGS)
      },
    }),
    {
      name: STORAGE_KEY,
      // Only persist the settings, not the actions
      partialize: (state) => ({
        theme: state.theme,
        defaultQuality: state.defaultQuality,
        defaultFormat: state.defaultFormat,
        stripMetadata: state.stripMetadata,
        advancedOptionsExpanded: state.advancedOptionsExpanded,
      }),
    }
  )
)
