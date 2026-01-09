/**
 * ThemeToggle component
 * Three-way toggle for light/dark/system theme selection
 * 
 * Requirements: 7.1, 7.4
 */

import * as React from 'react'
import { useTheme, type ResolvedTheme } from '../../hooks/useTheme'
import type { ThemeOption } from '../../types'
import { cn } from '../../lib/utils'

interface ThemeToggleProps {
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show labels next to icons */
  showLabels?: boolean
}

interface ThemeButtonProps {
  option: ThemeOption
  currentTheme: ThemeOption
  resolvedTheme: ResolvedTheme
  onClick: (theme: ThemeOption) => void
  size: 'sm' | 'md' | 'lg'
  showLabel: boolean
}

/**
 * Sun icon for light theme
 */
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

/**
 * Moon icon for dark theme
 */
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

/**
 * Monitor icon for system theme
 */
function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}

const sizeClasses = {
  sm: {
    button: 'h-8 px-2',
    icon: 'h-4 w-4',
    text: 'text-xs',
  },
  md: {
    button: 'h-9 px-3',
    icon: 'h-5 w-5',
    text: 'text-sm',
  },
  lg: {
    button: 'h-10 px-4',
    icon: 'h-6 w-6',
    text: 'text-base',
  },
}

const themeLabels: Record<ThemeOption, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/**
 * Individual theme button
 */
function ThemeButton({
  option,
  currentTheme,
  resolvedTheme,
  onClick,
  size,
  showLabel,
}: ThemeButtonProps) {
  const isActive = currentTheme === option
  const sizes = sizeClasses[size]

  const Icon = option === 'light' ? SunIcon : option === 'dark' ? MoonIcon : MonitorIcon

  // For system option, show which theme is currently resolved
  const ariaLabel =
    option === 'system'
      ? `System theme (currently ${resolvedTheme})`
      : `${themeLabels[option]} theme`

  return (
    <button
      type="button"
      onClick={() => onClick(option)}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
        sizes.button,
        isActive
          ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
          : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
      )}
      aria-label={ariaLabel}
      aria-pressed={isActive}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span className={sizes.text}>{themeLabels[option]}</span>}
    </button>
  )
}

/**
 * ThemeToggle component
 * 
 * Provides a three-way toggle for selecting light, dark, or system theme.
 * Persists selection to settings store and applies theme to document.
 */
export function ThemeToggle({
  className,
  size = 'md',
  showLabels = false,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-[var(--muted)] p-1',
        className
      )}
      role="group"
      aria-label="Theme selection"
    >
      <ThemeButton
        option="light"
        currentTheme={theme}
        resolvedTheme={resolvedTheme}
        onClick={setTheme}
        size={size}
        showLabel={showLabels}
      />
      <ThemeButton
        option="dark"
        currentTheme={theme}
        resolvedTheme={resolvedTheme}
        onClick={setTheme}
        size={size}
        showLabel={showLabels}
      />
      <ThemeButton
        option="system"
        currentTheme={theme}
        resolvedTheme={resolvedTheme}
        onClick={setTheme}
        size={size}
        showLabel={showLabels}
      />
    </div>
  )
}

/**
 * Compact theme toggle that cycles through themes
 * Useful for space-constrained layouts
 */
export function ThemeToggleCompact({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const cycleTheme = React.useCallback(() => {
    const themeOrder: ThemeOption[] = ['light', 'dark', 'system']
    const currentIndex = themeOrder.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themeOrder.length
    setTheme(themeOrder[nextIndex])
  }, [theme, setTheme])

  // Show the icon for the current resolved theme, with system indicator
  const Icon = theme === 'system' ? MonitorIcon : resolvedTheme === 'dark' ? MoonIcon : SunIcon

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md',
        'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
        'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
        'transition-colors',
        className
      )}
      aria-label={`Current theme: ${theme}${theme === 'system' ? ` (${resolvedTheme})` : ''}. Click to cycle.`}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
