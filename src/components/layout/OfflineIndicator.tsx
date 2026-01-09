/**
 * OfflineIndicator component
 * Displays a subtle indicator when the user is offline
 * 
 * Requirements: 8.3
 */

import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { cn } from '../../lib/utils'

interface OfflineIndicatorProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Offline indicator that shows when the browser is offline
 * 
 * Features:
 * - Subtle, non-intrusive design
 * - Smooth fade in/out animation
 * - Accessible with proper ARIA attributes
 * - Reassures users that all features still work offline
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOffline } = useOnlineStatus()

  if (!isOffline) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-[var(--muted)] text-[var(--muted-foreground)]',
        'text-sm font-medium',
        'animate-in fade-in duration-300',
        className
      )}
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>Offline — all features still work!</span>
    </div>
  )
}
