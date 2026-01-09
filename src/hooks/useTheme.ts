/**
 * useTheme hook
 * Manages theme state with system preference detection and smooth transitions
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import { useEffect, useState, useCallback } from 'react'
import { useSettingsStore } from '../stores/settings.store'
import { trackThemeChanged } from '../lib/analytics'
import type { ThemeOption } from '../types'

export type ResolvedTheme = 'light' | 'dark'

export interface UseThemeReturn {
  /** User's theme preference (light, dark, or system) */
  theme: ThemeOption
  /** The actual applied theme after resolving system preference */
  resolvedTheme: ResolvedTheme
  /** Set the theme preference */
  setTheme: (theme: ThemeOption) => void
  /** Whether the system prefers dark mode */
  systemPrefersDark: boolean
}

/**
 * Media query for detecting system dark mode preference
 */
const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)'

/**
 * Get the system's preferred color scheme
 */
function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia(DARK_MODE_MEDIA_QUERY).matches ? 'dark' : 'light'
}

/**
 * Resolve the actual theme based on user preference and system setting
 */
function resolveTheme(theme: ThemeOption, systemPreference: ResolvedTheme): ResolvedTheme {
  if (theme === 'system') {
    return systemPreference
  }
  return theme
}

/**
 * Apply theme class to document root element
 * Handles smooth transitions between themes
 */
function applyThemeToDocument(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  // Add transition class for smooth theme change
  root.classList.add('transition-theme')

  // Apply or remove dark class
  if (resolvedTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Remove transition class after animation completes to avoid
  // transitions on other property changes
  const transitionDuration = 200 // matches CSS transition duration
  setTimeout(() => {
    root.classList.remove('transition-theme')
  }, transitionDuration)
}

/**
 * Hook for managing application theme with system preference detection
 * 
 * Features:
 * - Detects system preference via matchMedia
 * - Applies theme class to document root
 * - Handles smooth transitions between themes
 * - Persists theme preference to settings store
 * - Automatically updates when system preference changes
 */
export function useTheme(): UseThemeReturn {
  const theme = useSettingsStore((state) => state.theme)
  const setThemeStore = useSettingsStore((state) => state.setTheme)

  // Track system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    return getSystemPreference() === 'dark'
  })

  // Calculate resolved theme
  const systemPreference: ResolvedTheme = systemPrefersDark ? 'dark' : 'light'
  const resolvedTheme = resolveTheme(theme, systemPreference)

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(DARK_MODE_MEDIA_QUERY)

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    
    // Legacy browsers (Safari < 14)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mediaQuery as any).addListener(handleChange)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => (mediaQuery as any).removeListener(handleChange)
  }, [])

  // Apply theme to document when resolved theme changes
  useEffect(() => {
    applyThemeToDocument(resolvedTheme)
  }, [resolvedTheme])

  // Apply theme on initial mount
  useEffect(() => {
    applyThemeToDocument(resolvedTheme)
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Memoized setTheme function with analytics tracking
  const setTheme = useCallback((newTheme: ThemeOption) => {
    trackThemeChanged(newTheme)
    setThemeStore(newTheme)
  }, [setThemeStore])

  return {
    theme,
    resolvedTheme,
    setTheme,
    systemPrefersDark,
  }
}

/**
 * Get the current resolved theme without React hooks
 * Useful for server-side rendering or non-React contexts
 */
export function getCurrentTheme(): ResolvedTheme {
  const theme = useSettingsStore.getState().theme
  const systemPreference = getSystemPreference()
  return resolveTheme(theme, systemPreference)
}

/**
 * Initialize theme on app startup
 * Call this early in the app lifecycle to prevent flash of wrong theme
 */
export function initializeTheme(): void {
  const theme = useSettingsStore.getState().theme
  const systemPreference = getSystemPreference()
  const resolvedTheme = resolveTheme(theme, systemPreference)
  
  // Apply immediately without transition to prevent flash
  if (typeof document !== 'undefined') {
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}
