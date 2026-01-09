/**
 * BatchStatus component
 * Displays progress for batch image compression operations
 * Requirements: 4.2, 4.3, 9.2, 9.3
 */

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { ProgressBar } from './ProgressBar'
import type { BatchProcessingProgress } from '../../hooks/useBatchProcessing'
import { useImageStore } from '../../stores/images.store'

export interface BatchStatusProps {
  isProcessing: boolean
  overallProgress: number
  individualProgress: Map<string, BatchProcessingProgress>
  completedCount: number
  totalCount: number
  onCancel: () => void
}

/**
 * Displays batch processing status with individual and overall progress
 */
export function BatchStatus({
  isProcessing,
  overallProgress,
  individualProgress,
  completedCount,
  totalCount,
  onCancel,
}: BatchStatusProps) {
  const { images } = useImageStore()

  // Don't render if no batch processing
  if (totalCount === 0) {
    return null
  }

  const isComplete = completedCount === totalCount && !isProcessing
  const hasErrors = Array.from(individualProgress.values()).some(
    (p) => p.status === 'error'
  )
  const errorCount = Array.from(individualProgress.values()).filter(
    (p) => p.status === 'error'
  ).length

  // Get image name by ID
  const getImageName = (imageId: string): string => {
    const image = images.find((img) => img.id === imageId)
    return image?.file.name || 'Unknown'
  }

  // Get status color
  const getStatusColor = (status: BatchProcessingProgress['status']): string => {
    switch (status) {
      case 'complete':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'processing':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-[var(--muted-foreground)]'
    }
  }

  // Get status text
  const getStatusText = (status: BatchProcessingProgress['status']): string => {
    switch (status) {
      case 'complete':
        return 'Complete'
      case 'error':
        return 'Failed'
      case 'processing':
        return 'Processing'
      default:
        return 'Queued'
    }
  }

  return (
    <Card 
      className="w-full"
      role="region"
      aria-label="Batch processing status"
      aria-live="polite"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle as="h3" className="text-lg">
            {isComplete ? 'Batch Complete' : 'Processing Images'}
          </CardTitle>
          {isProcessing && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onCancel}
              aria-label="Cancel all pending compression operations"
            >
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" id="overall-progress-label">Overall Progress</span>
            <span className="text-[var(--muted-foreground)]" aria-live="polite">
              {completedCount} / {totalCount} images
            </span>
          </div>
          <ProgressBar
            value={overallProgress}
            showPercentage
            size="lg"
            variant={isComplete ? 'success' : hasErrors ? 'warning' : 'default'}
            aria-labelledby="overall-progress-label"
          />
        </div>

        {/* Completion Summary */}
        {isComplete && (
          <div
            className={`rounded-md p-3 ${
              hasErrors
                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium">
              {hasErrors
                ? `Completed with ${errorCount} error${errorCount !== 1 ? 's' : ''}`
                : 'All images compressed successfully!'}
            </p>
          </div>
        )}

        {/* Individual Progress */}
        <div 
          className="space-y-3 max-h-64 overflow-y-auto"
          role="list"
          aria-label="Individual image progress"
        >
          {Array.from(individualProgress.entries()).map(([imageId, progress]) => (
            <div key={imageId} className="space-y-1" role="listitem">
              <div className="flex items-center justify-between text-sm">
                <span
                  className="truncate max-w-[200px]"
                  title={getImageName(imageId)}
                >
                  {getImageName(imageId)}
                </span>
                <span 
                  className={getStatusColor(progress.status)}
                  role="status"
                  aria-label={`${getImageName(imageId)}: ${getStatusText(progress.status)}`}
                >
                  {getStatusText(progress.status)}
                </span>
              </div>
              <ProgressBar
                value={progress.progress}
                size="sm"
                indeterminate={progress.status === 'processing' && progress.progress === 0}
                variant={
                  progress.status === 'complete'
                    ? 'success'
                    : progress.status === 'error'
                    ? 'error'
                    : 'default'
                }
                aria-label={`${getImageName(imageId)} progress: ${progress.progress}%`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
