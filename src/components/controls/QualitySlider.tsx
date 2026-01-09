import { useCallback, useEffect, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/utils/file-helpers'

interface QualitySliderProps {
  value: number // 0-100
  onChange: (value: number) => void
  debounceMs?: number // default 300
  showEstimate?: boolean
  estimatedOriginalSize?: number // bytes, for calculating estimated output
  className?: string
}

/**
 * QualitySlider component for adjusting compression quality
 * Uses shadcn/ui Slider with 300ms debounce for preview updates
 * Requirements: 2.1, 2.2
 */
export function QualitySlider({
  value,
  onChange,
  debounceMs = 300,
  showEstimate = false,
  estimatedOriginalSize,
  className,
}: QualitySliderProps) {
  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(value)

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, value, onChange, debounceMs])

  const handleValueChange = useCallback((values: number[]) => {
    const newValue = values[0]
    // Clamp to valid range 0-100
    const clampedValue = Math.max(0, Math.min(100, newValue))
    setLocalValue(clampedValue)
  }, [])

  // Estimate output size based on quality
  // This is a rough approximation: lower quality = smaller file
  const estimatedOutputSize = showEstimate && estimatedOriginalSize
    ? estimateOutputSize(estimatedOriginalSize, localValue)
    : null

  // Get quality label based on value
  const qualityLabel = getQualityLabel(localValue)

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label 
          htmlFor="quality-slider" 
          className="text-sm font-medium text-[var(--foreground)]"
        >
          Quality
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--primary)]">
            {localValue}%
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            ({qualityLabel})
          </span>
        </div>
      </div>

      <Slider
        id="quality-slider"
        value={[localValue]}
        onValueChange={handleValueChange}
        min={0}
        max={100}
        step={1}
        aria-label={`Quality: ${localValue}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={localValue}
        aria-valuetext={`${localValue}% quality`}
      />

      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>Smaller file</span>
        <span>Higher quality</span>
      </div>

      {/* Estimated output size indicator */}
      {estimatedOutputSize !== null && (
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <span className="text-xs text-[var(--muted-foreground)]">
            Estimated size
          </span>
          <span className="text-sm font-medium text-[var(--foreground)]">
            ~{formatBytes(estimatedOutputSize)}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Estimates output file size based on quality setting
 * This is a rough approximation for user feedback
 */
function estimateOutputSize(originalSize: number, quality: number): number {
  // Rough estimation: quality 100 = ~80% of original, quality 0 = ~10% of original
  // Linear interpolation between these points
  const minRatio = 0.1
  const maxRatio = 0.8
  const ratio = minRatio + (maxRatio - minRatio) * (quality / 100)
  return Math.round(originalSize * ratio)
}

/**
 * Gets a human-readable quality label
 */
function getQualityLabel(quality: number): string {
  if (quality >= 90) return 'Excellent'
  if (quality >= 70) return 'Good'
  if (quality >= 50) return 'Medium'
  if (quality >= 30) return 'Low'
  return 'Very Low'
}
