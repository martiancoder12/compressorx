/**
 * Analytics utility for Plausible event tracking
 * 
 * Provides type-safe custom event tracking for compression operations,
 * format selections, and batch processing metrics.
 * 
 * Privacy-friendly: Plausible is GDPR compliant and doesn't use cookies.
 */

// Extend Window interface for Plausible
declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void
  }
}

/**
 * Event names for analytics tracking
 */
export const AnalyticsEvents = {
  COMPRESSION_COMPLETE: 'Compression Complete',
  BATCH_COMPRESSION_COMPLETE: 'Batch Compression Complete',
  FORMAT_SELECTED: 'Format Selected',
  PRESET_SELECTED: 'Preset Selected',
  DOWNLOAD_SINGLE: 'Download Single',
  DOWNLOAD_ZIP: 'Download ZIP',
  THEME_CHANGED: 'Theme Changed',
} as const

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents]

/**
 * Track a custom event with Plausible
 * 
 * @param eventName - The name of the event to track
 * @param props - Optional properties to attach to the event
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  props?: Record<string, string | number | boolean>
): void {
  // Only track in production and if plausible is available
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(eventName, props ? { props } : undefined)
  }
}

/**
 * Track a single image compression completion
 */
export function trackCompressionComplete(data: {
  format: string
  quality: number
  originalSizeKB: number
  compressedSizeKB: number
  compressionRatio: number
}): void {
  trackEvent(AnalyticsEvents.COMPRESSION_COMPLETE, {
    format: data.format,
    quality: data.quality,
    original_size_kb: Math.round(data.originalSizeKB),
    compressed_size_kb: Math.round(data.compressedSizeKB),
    compression_ratio: Math.round(data.compressionRatio),
  })
}

/**
 * Track batch compression completion
 */
export function trackBatchCompressionComplete(data: {
  batchSize: number
  format: string
  quality: number
  totalOriginalSizeKB: number
  totalCompressedSizeKB: number
  averageCompressionRatio: number
}): void {
  trackEvent(AnalyticsEvents.BATCH_COMPRESSION_COMPLETE, {
    batch_size: data.batchSize,
    format: data.format,
    quality: data.quality,
    total_original_size_kb: Math.round(data.totalOriginalSizeKB),
    total_compressed_size_kb: Math.round(data.totalCompressedSizeKB),
    avg_compression_ratio: Math.round(data.averageCompressionRatio),
  })
}

/**
 * Track format selection
 */
export function trackFormatSelected(format: string): void {
  trackEvent(AnalyticsEvents.FORMAT_SELECTED, { format })
}

/**
 * Track preset selection
 */
export function trackPresetSelected(preset: string, quality: number): void {
  trackEvent(AnalyticsEvents.PRESET_SELECTED, { preset, quality })
}

/**
 * Track single file download
 */
export function trackDownloadSingle(format: string, sizeKB: number): void {
  trackEvent(AnalyticsEvents.DOWNLOAD_SINGLE, {
    format,
    size_kb: Math.round(sizeKB),
  })
}

/**
 * Track ZIP download
 */
export function trackDownloadZip(fileCount: number, totalSizeKB: number): void {
  trackEvent(AnalyticsEvents.DOWNLOAD_ZIP, {
    file_count: fileCount,
    total_size_kb: Math.round(totalSizeKB),
  })
}

/**
 * Track theme change
 */
export function trackThemeChanged(theme: 'light' | 'dark' | 'system'): void {
  trackEvent(AnalyticsEvents.THEME_CHANGED, { theme })
}
