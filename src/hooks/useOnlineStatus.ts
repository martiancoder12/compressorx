/**
 * useOnlineStatus hook
 * Detects online/offline status and provides reactive state
 * 
 * Requirements: 8.3
 */

import { useState, useEffect, useCallback } from 'react'

export interface UseOnlineStatusReturn {
  /** Whether the browser is currently online */
  isOnline: boolean
  /** Whether the browser is currently offline */
  isOffline: boolean
}

/**
 * Get the current online status
 */
function getOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') {
    return true // Assume online in SSR
  }
  return navigator.onLine
}

/**
 * Hook for detecting browser online/offline status
 * 
 * Features:
 * - Detects initial online status
 * - Listens for online/offline events
 * - Provides reactive state updates
 * - Works in all modern browsers
 * 
 * @returns Object with isOnline and isOffline boolean states
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(getOnlineStatus)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return {
    isOnline,
    isOffline: !isOnline,
  }
}
