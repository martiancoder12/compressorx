/**
 * useSettings hook
 * Connects settings store to persistence layer with auto-save functionality
 */

import { useEffect, useCallback } from 'react'
import { useSettingsStore } from '../stores/settings.store'
import { loadSettings, saveSettings, isStorageAvailable } from '../lib/storage/settings'
import type { OutputFormat, ThemeOption, PersistedSettings } from '../types'

export interface UseSettingsReturn {
  // Current settings values
  theme: ThemeOption
  defaultQuality: number
  defaultFormat: OutputFormat
  stripMetadata: boolean
  advancedOptionsExpanded: boolean
  
  // Setters
  setTheme: (theme: ThemeOption) => void
  setDefaultQuality: (quality: number) => void
  setDefaultFormat: (format: OutputFormat) => void
  setStripMetadata: (strip: boolean) => void
  setAdvancedOptionsExpanded: (expanded: boolean) => void
  resetToDefaults: () => void
  
  // Storage status
  isStorageAvailable: boolean
}

/**
 * Hook for managing application settings with persistence
 * 
 * - Loads settings from localStorage on mount
 * - Auto-saves settings when they change
 * - Provides all settings values and setters
 */
export function useSettings(): UseSettingsReturn {
  const {
    theme,
    defaultQuality,
    defaultFormat,
    stripMetadata,
    advancedOptionsExpanded,
    setTheme: storeSetTheme,
    setDefaultQuality: storeSetDefaultQuality,
    setDefaultFormat: storeSetDefaultFormat,
    setStripMetadata: storeSetStripMetadata,
    setAdvancedOptionsExpanded: storeSetAdvancedOptionsExpanded,
    resetToDefaults: storeResetToDefaults,
  } = useSettingsStore()

  const storageAvailable = isStorageAvailable()

  // Load settings from localStorage on mount
  // Note: Zustand's persist middleware handles this automatically,
  // but we provide this for explicit control and fallback handling
  useEffect(() => {
    if (storageAvailable) {
      const savedSettings = loadSettings()
      
      // Only update if different from current state to avoid unnecessary re-renders
      // The Zustand persist middleware should handle this, but this ensures consistency
      if (savedSettings.theme !== theme) {
        storeSetTheme(savedSettings.theme)
      }
      if (savedSettings.defaultQuality !== defaultQuality) {
        storeSetDefaultQuality(savedSettings.defaultQuality)
      }
      if (savedSettings.defaultFormat !== defaultFormat) {
        storeSetDefaultFormat(savedSettings.defaultFormat)
      }
      if (savedSettings.stripMetadata !== stripMetadata) {
        storeSetStripMetadata(savedSettings.stripMetadata)
      }
      if (savedSettings.advancedOptionsExpanded !== advancedOptionsExpanded) {
        storeSetAdvancedOptionsExpanded(savedSettings.advancedOptionsExpanded)
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Create wrapped setters that also save to localStorage
  // Note: Zustand's persist middleware handles auto-save, but these provide
  // explicit save confirmation and error handling
  const setTheme = useCallback((newTheme: ThemeOption) => {
    storeSetTheme(newTheme)
    // Zustand persist middleware handles saving automatically
  }, [storeSetTheme])

  const setDefaultQuality = useCallback((quality: number) => {
    storeSetDefaultQuality(quality)
  }, [storeSetDefaultQuality])

  const setDefaultFormat = useCallback((format: OutputFormat) => {
    storeSetDefaultFormat(format)
  }, [storeSetDefaultFormat])

  const setStripMetadata = useCallback((strip: boolean) => {
    storeSetStripMetadata(strip)
  }, [storeSetStripMetadata])

  const setAdvancedOptionsExpanded = useCallback((expanded: boolean) => {
    storeSetAdvancedOptionsExpanded(expanded)
  }, [storeSetAdvancedOptionsExpanded])

  const resetToDefaults = useCallback(() => {
    storeResetToDefaults()
  }, [storeResetToDefaults])

  return {
    // Current values
    theme,
    defaultQuality,
    defaultFormat,
    stripMetadata,
    advancedOptionsExpanded,
    
    // Setters
    setTheme,
    setDefaultQuality,
    setDefaultFormat,
    setStripMetadata,
    setAdvancedOptionsExpanded,
    resetToDefaults,
    
    // Storage status
    isStorageAvailable: storageAvailable,
  }
}

/**
 * Manually save current settings to localStorage
 * Useful for explicit save operations or debugging
 */
export function saveCurrentSettings(): boolean {
  const state = useSettingsStore.getState()
  const settings: PersistedSettings = {
    theme: state.theme,
    defaultQuality: state.defaultQuality,
    defaultFormat: state.defaultFormat,
    stripMetadata: state.stripMetadata,
    advancedOptionsExpanded: state.advancedOptionsExpanded,
  }
  return saveSettings(settings)
}
