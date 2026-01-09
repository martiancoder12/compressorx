import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { 
  saveSettings, 
  loadSettings, 
  clearSettings, 
  validateSettings,
  SETTINGS_STORAGE_KEY 
} from './settings'
import type { PersistedSettings, OutputFormat, ThemeOption } from '../../types'
import { DEFAULT_SETTINGS } from '../../types'

// Clear localStorage before and after each test
beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

// Arbitraries for generating valid settings
const themeArbitrary = fc.constantFrom<ThemeOption>('light', 'dark', 'system')
const formatArbitrary = fc.constantFrom<OutputFormat>('jpeg', 'png', 'webp', 'avif')
const qualityArbitrary = fc.integer({ min: 0, max: 100 })
const booleanArbitrary = fc.boolean()

const validSettingsArbitrary = fc.record({
  theme: themeArbitrary,
  defaultQuality: qualityArbitrary,
  defaultFormat: formatArbitrary,
  stripMetadata: booleanArbitrary,
  advancedOptionsExpanded: booleanArbitrary,
})

/**
 * Feature: compressorx, Property 11: Settings Persistence Round-Trip
 * 
 * For any valid settings object (theme, defaultQuality, defaultFormat, stripMetadata),
 * saving to storage and then loading SHALL return an equivalent settings object.
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.5
 */
describe('Feature: compressorx, Property 11: Settings Persistence Round-Trip', () => {
  it('save then load returns equivalent settings object', () => {
    fc.assert(
      fc.property(
        validSettingsArbitrary,
        (settings: PersistedSettings) => {
          // Clear any existing data
          localStorage.clear()
          
          // Save settings
          const saveResult = saveSettings(settings)
          expect(saveResult).toBe(true)
          
          // Load settings
          const loaded = loadSettings()
          
          // Verify all fields match
          return (
            loaded.theme === settings.theme &&
            loaded.defaultQuality === settings.defaultQuality &&
            loaded.defaultFormat === settings.defaultFormat &&
            loaded.stripMetadata === settings.stripMetadata &&
            loaded.advancedOptionsExpanded === settings.advancedOptionsExpanded
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('multiple save/load cycles preserve settings', () => {
    fc.assert(
      fc.property(
        fc.array(validSettingsArbitrary, { minLength: 1, maxLength: 5 }),
        (settingsArray: PersistedSettings[]) => {
          localStorage.clear()
          
          // Save and load each settings object in sequence
          for (const settings of settingsArray) {
            saveSettings(settings)
            const loaded = loadSettings()
            
            if (
              loaded.theme !== settings.theme ||
              loaded.defaultQuality !== settings.defaultQuality ||
              loaded.defaultFormat !== settings.defaultFormat ||
              loaded.stripMetadata !== settings.stripMetadata ||
              loaded.advancedOptionsExpanded !== settings.advancedOptionsExpanded
            ) {
              return false
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('loading from empty storage returns defaults', () => {
    localStorage.clear()
    const loaded = loadSettings()
    
    expect(loaded).toEqual(DEFAULT_SETTINGS)
  })

  it('loading after clear returns defaults', () => {
    fc.assert(
      fc.property(
        validSettingsArbitrary,
        (settings: PersistedSettings) => {
          localStorage.clear()
          
          // Save, then clear, then load
          saveSettings(settings)
          clearSettings()
          const loaded = loadSettings()
          
          // Should return defaults after clear
          return (
            loaded.theme === DEFAULT_SETTINGS.theme &&
            loaded.defaultQuality === DEFAULT_SETTINGS.defaultQuality &&
            loaded.defaultFormat === DEFAULT_SETTINGS.defaultFormat &&
            loaded.stripMetadata === DEFAULT_SETTINGS.stripMetadata &&
            loaded.advancedOptionsExpanded === DEFAULT_SETTINGS.advancedOptionsExpanded
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Settings validation handles corrupted data gracefully', () => {
  it('returns defaults for null/undefined input', () => {
    expect(validateSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(validateSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults for non-object input', () => {
    expect(validateSettings('string')).toEqual(DEFAULT_SETTINGS)
    expect(validateSettings(123)).toEqual(DEFAULT_SETTINGS)
    expect(validateSettings([])).toEqual(DEFAULT_SETTINGS)
  })

  it('uses defaults for invalid theme values', () => {
    const result = validateSettings({ theme: 'invalid' })
    expect(result.theme).toBe(DEFAULT_SETTINGS.theme)
  })

  it('uses defaults for invalid quality values', () => {
    expect(validateSettings({ defaultQuality: -1 }).defaultQuality).toBe(DEFAULT_SETTINGS.defaultQuality)
    expect(validateSettings({ defaultQuality: 101 }).defaultQuality).toBe(DEFAULT_SETTINGS.defaultQuality)
    expect(validateSettings({ defaultQuality: 'high' }).defaultQuality).toBe(DEFAULT_SETTINGS.defaultQuality)
    expect(validateSettings({ defaultQuality: NaN }).defaultQuality).toBe(DEFAULT_SETTINGS.defaultQuality)
    expect(validateSettings({ defaultQuality: Infinity }).defaultQuality).toBe(DEFAULT_SETTINGS.defaultQuality)
  })

  it('uses defaults for invalid format values', () => {
    const result = validateSettings({ defaultFormat: 'gif' })
    expect(result.defaultFormat).toBe(DEFAULT_SETTINGS.defaultFormat)
  })

  it('uses defaults for invalid boolean values', () => {
    expect(validateSettings({ stripMetadata: 'yes' }).stripMetadata).toBe(DEFAULT_SETTINGS.stripMetadata)
    expect(validateSettings({ advancedOptionsExpanded: 1 }).advancedOptionsExpanded).toBe(DEFAULT_SETTINGS.advancedOptionsExpanded)
  })

  it('preserves valid fields while defaulting invalid ones', () => {
    const partial = {
      theme: 'dark' as const,
      defaultQuality: 'invalid',
      defaultFormat: 'webp' as const,
      stripMetadata: false,
      advancedOptionsExpanded: 'invalid',
    }
    
    const result = validateSettings(partial)
    
    expect(result.theme).toBe('dark')
    expect(result.defaultQuality).toBe(DEFAULT_SETTINGS.defaultQuality)
    expect(result.defaultFormat).toBe('webp')
    expect(result.stripMetadata).toBe(false)
    expect(result.advancedOptionsExpanded).toBe(DEFAULT_SETTINGS.advancedOptionsExpanded)
  })

  it('handles corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, 'not valid json{{{')
    const loaded = loadSettings()
    expect(loaded).toEqual(DEFAULT_SETTINGS)
  })

  it('handles empty object in localStorage', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{}')
    const loaded = loadSettings()
    expect(loaded).toEqual(DEFAULT_SETTINGS)
  })
})
