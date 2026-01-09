import type { PersistedSettings, OutputFormat, ThemeOption } from '../../types'
import { DEFAULT_SETTINGS } from '../../types'

/**
 * Storage key for localStorage persistence
 */
export const SETTINGS_STORAGE_KEY = 'compressorx-settings'

/**
 * Valid theme options for validation
 */
const VALID_THEMES: ThemeOption[] = ['light', 'dark', 'system']

/**
 * Valid output formats for validation
 */
const VALID_FORMATS: OutputFormat[] = ['jpeg', 'png', 'webp', 'avif']

/**
 * Validates a theme value
 */
function isValidTheme(value: unknown): value is ThemeOption {
  return typeof value === 'string' && VALID_THEMES.includes(value as ThemeOption)
}

/**
 * Validates an output format value
 */
function isValidFormat(value: unknown): value is OutputFormat {
  return typeof value === 'string' && VALID_FORMATS.includes(value as OutputFormat)
}

/**
 * Validates a quality value (0-100)
 */
function isValidQuality(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100 && Number.isFinite(value)
}

/**
 * Validates a boolean value
 */
function isValidBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Validates and sanitizes a settings object
 * Returns a valid PersistedSettings object, using defaults for invalid fields
 */
export function validateSettings(data: unknown): PersistedSettings {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_SETTINGS }
  }

  const obj = data as Record<string, unknown>

  return {
    theme: isValidTheme(obj.theme) ? obj.theme : DEFAULT_SETTINGS.theme,
    defaultQuality: isValidQuality(obj.defaultQuality) 
      ? obj.defaultQuality 
      : DEFAULT_SETTINGS.defaultQuality,
    defaultFormat: isValidFormat(obj.defaultFormat) 
      ? obj.defaultFormat 
      : DEFAULT_SETTINGS.defaultFormat,
    stripMetadata: isValidBoolean(obj.stripMetadata) 
      ? obj.stripMetadata 
      : DEFAULT_SETTINGS.stripMetadata,
    advancedOptionsExpanded: isValidBoolean(obj.advancedOptionsExpanded) 
      ? obj.advancedOptionsExpanded 
      : DEFAULT_SETTINGS.advancedOptionsExpanded,
  }
}

/**
 * Saves settings to localStorage
 * Returns true if successful, false otherwise
 */
export function saveSettings(settings: PersistedSettings): boolean {
  try {
    // Validate settings before saving
    const validatedSettings = validateSettings(settings)
    
    // Zustand persist middleware wraps state in a specific format
    const storageData = {
      state: validatedSettings,
      version: 0,
    }
    
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(storageData))
    return true
  } catch (error) {
    // localStorage might be full or unavailable
    console.error('Failed to save settings:', error)
    return false
  }
}

/**
 * Loads settings from localStorage
 * Returns validated settings, falling back to defaults for missing/invalid data
 */
export function loadSettings(): PersistedSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    
    if (!stored) {
      return { ...DEFAULT_SETTINGS }
    }

    const parsed = JSON.parse(stored)
    
    // Handle Zustand persist middleware format
    const state = parsed?.state ?? parsed
    
    return validateSettings(state)
  } catch (error) {
    // JSON parse error or other issues
    console.error('Failed to load settings:', error)
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Clears settings from localStorage
 * Returns true if successful, false otherwise
 */
export function clearSettings(): boolean {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Failed to clear settings:', error)
    return false
  }
}

/**
 * Checks if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}
