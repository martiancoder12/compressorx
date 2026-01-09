/**
 * ProgressBar component
 * Animated progress indicator with percentage display and indeterminate state
 */

import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  /** Progress value from 0 to 100 */
  value: number
  /** Show percentage text */
  showPercentage?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error'
  /** Show indeterminate animation (for unknown progress) */
  indeterminate?: boolean
  /** Additional CSS classes */
  className?: string
  /** Accessible label */
  'aria-label'?: string
}

/**
 * Animated progress bar with multiple variants and indeterminate state support
 */
export function ProgressBar({
  value,
  showPercentage = false,
  size = 'md',
  variant = 'default',
  indeterminate = false,
  className,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  // Clamp value to 0-100
  const clampedValue = Math.min(100, Math.max(0, value))

  // Size classes
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  // Variant classes for the indicator
  const variantClasses = {
    default: 'bg-[var(--primary)]',
    success: 'bg-green-500 dark:bg-green-400',
    warning: 'bg-yellow-500 dark:bg-yellow-400',
    error: 'bg-red-500 dark:bg-red-400',
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || `Progress: ${clampedValue}%`}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-[var(--secondary)]',
          sizeClasses[size]
        )}
      >
        {indeterminate ? (
          // Indeterminate animation
          <div
            className={cn(
              'absolute h-full w-1/3 rounded-full animate-indeterminate',
              variantClasses[variant]
            )}
          />
        ) : (
          // Determinate progress
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              variantClasses[variant]
            )}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
      {showPercentage && !indeterminate && (
        <div className="mt-1 text-right text-xs text-[var(--muted-foreground)]">
          {Math.round(clampedValue)}%
        </div>
      )}
    </div>
  )
}
