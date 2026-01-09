/**
 * Footer component
 * Displays credits and links including GitHub repository
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

import { cn } from '../../lib/utils'

interface FooterProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * GitHub icon
 */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

/**
 * Heart icon for credits
 */
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

/**
 * Footer component with credits and links
 */
export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className={cn(
        'border-t border-[var(--border)] bg-[var(--background)]',
        className
      )}
      role="contentinfo"
    >
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Credits */}
          <p className="text-body-sm text-[var(--muted-foreground)] flex items-center gap-1">
            Made with{' '}
            <HeartIcon className="h-4 w-4 text-[var(--destructive)]" />
            <span className="sr-only">love</span>
            {' '}for the web
          </p>

          {/* Links */}
          <nav className="flex items-center gap-4" aria-label="Footer navigation">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-body-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-md"
              aria-label="View source code on GitHub (opens in new tab)"
            >
              <GitHubIcon className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            <span className="text-[var(--muted-foreground)]" aria-hidden="true">·</span>
            <span className="text-body-sm text-[var(--muted-foreground)]">
              © {currentYear} CompressorX
            </span>
          </nav>
        </div>

        {/* Privacy note */}
        <p className="mt-4 text-center text-caption text-[var(--muted-foreground)]">
          All processing happens in your browser. Your images never leave your device.
        </p>
      </div>
    </footer>
  )
}
