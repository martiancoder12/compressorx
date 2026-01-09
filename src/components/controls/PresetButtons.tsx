import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { trackPresetSelected } from '@/lib/analytics'
import { QUALITY_PRESETS, type QualityPreset } from '@/types'

interface PresetButtonsProps {
  currentQuality: number
  onPresetSelect: (quality: number) => void
  className?: string
}

/**
 * PresetButtons component for quick quality preset selection
 * Renders buttons for all quality presets with active state highlighting
 * Requirements: 2.3
 */
export function PresetButtons({
  currentQuality,
  onPresetSelect,
  className,
}: PresetButtonsProps) {
  const handlePresetClick = useCallback(
    (preset: QualityPreset) => {
      trackPresetSelected(preset.name, preset.quality)
      onPresetSelect(preset.quality)
    },
    [onPresetSelect]
  )

  // Find active preset (if current quality matches a preset)
  const activePreset = QUALITY_PRESETS.find(
    (preset) => preset.quality === currentQuality
  )

  return (
    <div className={cn('w-full space-y-3', className)}>
      <label className="text-sm font-medium text-[var(--foreground)]">
        Quality Presets
      </label>

      <div 
        className="grid grid-cols-2 gap-2"
        role="group"
        aria-label="Quality presets"
      >
        {QUALITY_PRESETS.map((preset) => {
          const isActive = activePreset?.name === preset.name

          return (
            <Button
              key={preset.name}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'flex flex-col items-start h-auto py-2 px-3',
                isActive && 'ring-2 ring-[var(--primary)] ring-offset-2'
              )}
              aria-pressed={isActive}
              aria-label={`${preset.name}: ${preset.description}`}
            >
              <span className="text-xs font-semibold truncate w-full text-left">
                {preset.name}
              </span>
              <span 
                className={cn(
                  'text-xs truncate w-full text-left',
                  isActive 
                    ? 'text-[var(--primary-foreground)]/80' 
                    : 'text-[var(--muted-foreground)]'
                )}
              >
                {preset.description}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Show current preset info if active */}
      {activePreset && (
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Using <span className="font-medium">{activePreset.name}</span> preset (Quality: {activePreset.quality}%)
        </p>
      )}
    </div>
  )
}
