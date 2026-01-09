/**
 * Header component
 * Displays app logo, name, and theme toggle
 * Responsive design for mobile
 * 
 * Requirements: 9.1, 8.3, 9.2, 9.3
 */

import { ThemeToggle, ThemeToggleCompact } from './ThemeToggle'
import { OfflineIndicator } from './OfflineIndicator'
import { cn } from '../../lib/utils'

interface HeaderProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * CompressorX logo icon
 */
function LogoIcon({ className }: { className?: string }) {
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
      {/* Compress arrows */}
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M3 21l7-7" />
      {/* Image frame */}
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </svg>
  )
}

/**
 * Header component with app branding and theme controls
 */
export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/60',
        className
      )}
      role="banner"
    >
      <nav 
        className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4"
        aria-label="Main navigation"
      >
        {/* Logo and App Name */}
        <a
          href="/"
          className="flex items-center gap-2 transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-md"
          aria-label="CompressorX Home"
        >
          <LogoIcon className="h-7 w-7 text-[var(--primary)]" />
          <span className="text-heading-4 font-semibold text-[var(--foreground)]">
            CompressorX
          </span>
        </a>

        {/* Theme Toggle - Full on desktop, compact on mobile */}
        <div className="flex items-center gap-2" role="group" aria-label="Application controls">
          {/* Offline Indicator */}
          <OfflineIndicator />
          {/* Desktop theme toggle */}
          <div className="hidden sm:block">
            <ThemeToggle size="sm" />
          </div>
          {/* Mobile theme toggle */}
          <div className="block sm:hidden">
            <ThemeToggleCompact />
          </div>
        </div>
      </nav>
    </header>
  )
}
