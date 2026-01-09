import { useCallback, useState } from 'react'
import { Link2, Link2Off } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface DimensionControlsProps {
  maxWidth?: number
  maxHeight?: number
  maintainAspectRatio: boolean
  onMaxWidthChange: (width: number | undefined) => void
  onMaxHeightChange: (height: number | undefined) => void
  onAspectRatioChange: (maintain: boolean) => void
  originalWidth?: number
  originalHeight?: number
  className?: string
}

/**
 * DimensionControls component for setting max dimensions and aspect ratio
 * Includes max width/height inputs, aspect ratio toggle, and percentage scaling
 * Requirements: 2.7
 *
 * This is a controlled component that uses props as the source of truth.
 * Input fields display prop values directly to avoid sync issues.
 */
export function DimensionControls({
  maxWidth,
  maxHeight,
  maintainAspectRatio,
  onMaxWidthChange,
  onMaxHeightChange,
  onAspectRatioChange,
  originalWidth,
  originalHeight,
  className,
}: DimensionControlsProps) {
  // Derive display values directly from props (controlled component pattern)
  const widthInput = maxWidth?.toString() ?? ''
  const heightInput = maxHeight?.toString() ?? ''
  const [scalePercent, setScalePercent] = useState(100)

  // Handle width input change
  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      const numValue = parseInt(value, 10)

      if (value === '' || isNaN(numValue)) {
        onMaxWidthChange(undefined)
      } else if (numValue > 0) {
        onMaxWidthChange(numValue)

        // Update height if maintaining aspect ratio
        if (maintainAspectRatio && originalWidth && originalHeight) {
          const aspectRatio = originalWidth / originalHeight
          const newHeight = Math.round(numValue / aspectRatio)
          onMaxHeightChange(newHeight)
        }
      }
    },
    [onMaxWidthChange, onMaxHeightChange, maintainAspectRatio, originalWidth, originalHeight]
  )

  // Handle height input change
  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      const numValue = parseInt(value, 10)

      if (value === '' || isNaN(numValue)) {
        onMaxHeightChange(undefined)
      } else if (numValue > 0) {
        onMaxHeightChange(numValue)

        // Update width if maintaining aspect ratio
        if (maintainAspectRatio && originalWidth && originalHeight) {
          const aspectRatio = originalWidth / originalHeight
          const newWidth = Math.round(numValue * aspectRatio)
          onMaxWidthChange(newWidth)
        }
      }
    },
    [onMaxWidthChange, onMaxHeightChange, maintainAspectRatio, originalWidth, originalHeight]
  )

  // Handle percentage scale change
  const handleScaleChange = useCallback(
    (values: number[]) => {
      const percent = values[0]
      setScalePercent(percent)

      if (originalWidth && originalHeight) {
        const newWidth = Math.round((originalWidth * percent) / 100)
        const newHeight = Math.round((originalHeight * percent) / 100)

        onMaxWidthChange(newWidth)
        onMaxHeightChange(newHeight)
      }
    },
    [originalWidth, originalHeight, onMaxWidthChange, onMaxHeightChange]
  )

  // Toggle aspect ratio lock
  const toggleAspectRatio = useCallback(() => {
    onAspectRatioChange(!maintainAspectRatio)
  }, [maintainAspectRatio, onAspectRatioChange])

  // Clear dimensions
  const clearDimensions = useCallback(() => {
    setScalePercent(100)
    onMaxWidthChange(undefined)
    onMaxHeightChange(undefined)
  }, [onMaxWidthChange, onMaxHeightChange])

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--foreground)]">
          Dimensions
        </label>
        {(maxWidth || maxHeight) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDimensions}
            className="h-6 px-2 text-xs"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Width and Height inputs with aspect ratio lock */}
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <label 
            htmlFor="max-width"
            className="text-xs text-[var(--muted-foreground)]"
          >
            Max Width (px)
          </label>
          <input
            id="max-width"
            type="number"
            min="1"
            placeholder="Auto"
            value={widthInput}
            onChange={handleWidthChange}
            className={cn(
              'w-full h-9 px-3 rounded-md text-sm',
              'border border-[var(--input)] bg-[var(--background)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
              'focus-visible:border-[var(--ring)]',
              'placeholder:text-[var(--muted-foreground)]'
            )}
            aria-label="Maximum width in pixels"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleAspectRatio}
          className="mt-5 h-9 w-9"
          aria-label={maintainAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          aria-pressed={maintainAspectRatio}
        >
          {maintainAspectRatio ? (
            <Link2 className="h-4 w-4 text-[var(--primary)]" />
          ) : (
            <Link2Off className="h-4 w-4 text-[var(--muted-foreground)]" />
          )}
        </Button>

        <div className="flex-1 space-y-1">
          <label 
            htmlFor="max-height"
            className="text-xs text-[var(--muted-foreground)]"
          >
            Max Height (px)
          </label>
          <input
            id="max-height"
            type="number"
            min="1"
            placeholder="Auto"
            value={heightInput}
            onChange={handleHeightChange}
            className={cn(
              'w-full h-9 px-3 rounded-md text-sm',
              'border border-[var(--input)] bg-[var(--background)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
              'focus-visible:border-[var(--ring)]',
              'placeholder:text-[var(--muted-foreground)]'
            )}
            aria-label="Maximum height in pixels"
          />
        </div>
      </div>

      {/* Aspect ratio indicator */}
      <p className="text-xs text-[var(--muted-foreground)]">
        {maintainAspectRatio 
          ? 'Aspect ratio locked - dimensions will scale proportionally'
          : 'Aspect ratio unlocked - dimensions can be set independently'
        }
      </p>

      {/* Percentage scaling slider */}
      {originalWidth && originalHeight && (
        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <label 
              htmlFor="scale-slider"
              className="text-xs text-[var(--muted-foreground)]"
            >
              Scale
            </label>
            <span className="text-sm font-medium text-[var(--foreground)]">
              {scalePercent}%
            </span>
          </div>

          <Slider
            id="scale-slider"
            value={[scalePercent]}
            onValueChange={handleScaleChange}
            min={10}
            max={100}
            step={5}
            aria-label={`Scale: ${scalePercent}%`}
          />

          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Original dimensions info */}
      {originalWidth && originalHeight && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Original: {originalWidth} × {originalHeight} px
        </p>
      )}
    </div>
  )
}
