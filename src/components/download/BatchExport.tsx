/**
 * BatchExport component
 * Shows ZIP download option when multiple images are compressed
 * Displays ZIP creation progress and auto-triggers download on completion
 * Requirements: 5.3, 5.4, 5.5, 9.2, 9.3
 */

import { useState } from 'react'
import { Archive, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/processing/ProgressBar'
import { generateZip, downloadZip, type ZipImageItem } from '@/lib/utils/zip-generator'
import { formatBytes } from '@/lib/utils/file-helpers'
import { trackDownloadZip } from '@/lib/analytics'
import type { ImageFile } from '@/types'

export interface BatchExportProps {
  /** Array of images with compression results */
  images: ImageFile[]
  /** Additional CSS classes */
  className?: string
  /** Callback when export starts */
  onExportStart?: () => void
  /** Callback when export completes */
  onExportComplete?: () => void
  /** Callback when export fails */
  onExportError?: (error: Error) => void
}

type ExportState = 'idle' | 'generating' | 'complete' | 'error'

/**
 * Component for batch exporting multiple compressed images as a ZIP archive
 */
export function BatchExport({
  images,
  className,
  onExportStart,
  onExportComplete,
  onExportError,
}: BatchExportProps) {
  const [state, setState] = useState<ExportState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Filter to only completed images with compression results
  const completedImages = images.filter(
    (img) => img.status === 'complete' && img.compressed !== null
  )

  // Calculate total compressed size
  const totalSize = completedImages.reduce(
    (sum, img) => sum + (img.compressed?.compressedSize ?? 0),
    0
  )

  const handleExport = async () => {
    setState('generating')
    setProgress(0)
    setError(null)
    onExportStart?.()

    try {
      // Prepare images for ZIP generation
      const zipItems: ZipImageItem[] = completedImages.map((img) => ({
        blob: img.compressed!.blob,
        originalFilename: img.file.name,
        format: img.compressed!.format,
      }))

      // Generate the ZIP with progress tracking
      const result = await generateZip(zipItems, (p) => {
        setProgress(p)
      })

      // Auto-trigger download on completion (Requirement 5.5)
      downloadZip(result.blob)

      // Track ZIP download analytics
      trackDownloadZip(completedImages.length, result.blob.size / 1024)

      setState('complete')
      onExportComplete?.()

      // Reset to idle after a short delay
      setTimeout(() => {
        setState('idle')
        setProgress(0)
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create ZIP'
      setError(errorMessage)
      setState('error')
      onExportError?.(err instanceof Error ? err : new Error(errorMessage))
    }
  }

  // Don't show if less than 2 completed images
  if (completedImages.length < 2) {
    return null
  }

  return (
    <div className={className} role="region" aria-label="Batch export options">
      {state === 'idle' && (
        <Button 
          onClick={handleExport} 
          variant="outline" 
          className="w-full"
          aria-label={`Download all ${completedImages.length} compressed images as ZIP archive, total size ${formatBytes(totalSize)}`}
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          <span>Download All as ZIP ({completedImages.length} images, {formatBytes(totalSize)})</span>
        </Button>
      )}

      {state === 'generating' && (
        <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Creating ZIP archive...</span>
          </div>
          <ProgressBar 
            value={progress} 
            showPercentage 
            size="md" 
            aria-label={`ZIP creation progress: ${Math.round(progress)}%`}
          />
        </div>
      )}

      {state === 'complete' && (
        <div 
          className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
          role="status"
          aria-live="polite"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Download started!</span>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-2" role="alert" aria-live="assertive">
          <div className="text-sm text-red-600 dark:text-red-400">
            {error || 'Failed to create ZIP archive'}
          </div>
          <Button 
            onClick={handleExport} 
            variant="outline" 
            size="sm"
            aria-label="Retry ZIP archive creation"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}
