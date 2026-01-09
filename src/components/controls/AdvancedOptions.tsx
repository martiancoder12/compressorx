import { useCallback } from 'react'
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OutputFormat } from '@/types'

interface AdvancedOptionsProps {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  stripMetadata: boolean
  onStripMetadataChange: (strip: boolean) => void
  progressive?: boolean
  onProgressiveChange?: (progressive: boolean) => void
  currentFormat: OutputFormat
  className?: string
}

/**
 * AdvancedOptions component for additional compression settings
 * Collapsible section with metadata and progressive encoding toggles
 * Requirements: 2.8
 */
export function AdvancedOptions({
  expanded,
  onExpandedChange,
  stripMetadata,
  onStripMetadataChange,
  progressive = false,
  onProgressiveChange,
  currentFormat,
  className,
}: AdvancedOptionsProps) {
  const toggleExpanded = useCallback(() => {
    onExpandedChange(!expanded)
  }, [expanded, onExpandedChange])

  const handleMetadataToggle = useCallback(() => {
    onStripMetadataChange(!stripMetadata)
  }, [stripMetadata, onStripMetadataChange])

  const handleProgressiveToggle = useCallback(() => {
    onProgressiveChange?.(!progressive)
  }, [progressive, onProgressiveChange])

  // Progressive encoding is only available for JPEG
  const showProgressiveOption = currentFormat === 'jpeg' && onProgressiveChange

  return (
    <div className={cn('w-full', className)}>
      {/* Collapsible header */}
      <Button
        variant="ghost"
        onClick={toggleExpanded}
        className="w-full justify-between h-10 px-3"
        aria-expanded={expanded}
        aria-controls="advanced-options-content"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4" />
          Advanced Options
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {/* Collapsible content */}
      {expanded && (
        <div 
          id="advanced-options-content"
          className="mt-2 space-y-4 p-4 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]"
        >
          {/* Metadata preservation toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label 
                htmlFor="strip-metadata"
                className="text-sm font-medium text-[var(--foreground)] cursor-pointer"
              >
                Strip Metadata
              </label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Remove EXIF data, GPS location, camera info
              </p>
            </div>
            <ToggleSwitch
              id="strip-metadata"
              checked={stripMetadata}
              onChange={handleMetadataToggle}
              aria-label="Strip metadata from images"
            />
          </div>

          {/* Progressive encoding toggle (JPEG only) */}
          {showProgressiveOption && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <div className="space-y-0.5">
                <label 
                  htmlFor="progressive-encoding"
                  className="text-sm font-medium text-[var(--foreground)] cursor-pointer"
                >
                  Progressive Encoding
                </label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Load image progressively (JPEG only)
                </p>
              </div>
              <ToggleSwitch
                id="progressive-encoding"
                checked={progressive}
                onChange={handleProgressiveToggle}
                aria-label="Enable progressive encoding for JPEG"
              />
            </div>
          )}

          {/* Info about current settings */}
          <div className="pt-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted-foreground)]">
              {stripMetadata 
                ? '✓ Metadata will be removed for privacy and smaller file size'
                : '○ Metadata will be preserved in the output file'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Simple toggle switch component
 */
interface ToggleSwitchProps {
  id: string
  checked: boolean
  onChange: () => void
  'aria-label': string
}

function ToggleSwitch({ id, checked, onChange, 'aria-label': ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      onKeyDown={(e) => {
        // Toggle on Space or Enter
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange()
        }
      }}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        checked ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
        aria-hidden="true"
      />
    </button>
  )
}
