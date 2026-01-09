import { useMemo, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { canUseAVIF } from '@/lib/compression/compressor'
import { trackFormatSelected } from '@/lib/analytics'
import type { OutputFormat } from '@/types'

interface FormatOption {
  value: OutputFormat
  label: string
  description: string
  recommended?: boolean
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'webp',
    label: 'WebP',
    description: 'Best balance of quality and size',
    recommended: true,
  },
  {
    value: 'jpeg',
    label: 'JPEG',
    description: 'Universal compatibility',
  },
  {
    value: 'png',
    label: 'PNG',
    description: 'Lossless, supports transparency',
  },
  {
    value: 'avif',
    label: 'AVIF',
    description: 'Best compression, limited support',
  },
]

interface FormatSelectorProps {
  value: OutputFormat
  onChange: (format: OutputFormat) => void
  className?: string
}

/**
 * FormatSelector component for choosing output image format
 * Uses shadcn/ui Select with browser support indicators
 * Disables AVIF if not supported, defaults to WebP
 * Requirements: 2.4, 2.5, 2.6
 */
export function FormatSelector({
  value,
  onChange,
  className,
}: FormatSelectorProps) {
  // Check AVIF support once on mount
  const avifSupported = useMemo(() => canUseAVIF(), [])

  // Get current format option for display
  const currentOption = FORMAT_OPTIONS.find((opt) => opt.value === value)

  // Handle format change with analytics tracking
  const handleFormatChange = useCallback((newValue: string) => {
    const format = newValue as OutputFormat
    trackFormatSelected(format)
    onChange(format)
  }, [onChange])

  return (
    <div className={cn('w-full space-y-2', className)}>
      <label 
        htmlFor="format-selector"
        className="text-sm font-medium text-[var(--foreground)]"
      >
        Output Format
      </label>

      <Select
        value={value}
        onValueChange={handleFormatChange}
      >
        <SelectTrigger 
          id="format-selector"
          className="w-full"
          aria-label="Select output format"
        >
          <SelectValue placeholder="Select format">
            {currentOption && (
              <span className="flex items-center gap-2">
                <span>{currentOption.label}</span>
                {currentOption.recommended && (
                  <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {FORMAT_OPTIONS.map((option) => {
            const isDisabled = option.value === 'avif' && !avifSupported

            return (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={isDisabled}
                className="py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {option.recommended && (
                      <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                    {isDisabled && (
                      <span className="text-xs bg-[var(--destructive)]/10 text-[var(--destructive)] px-1.5 py-0.5 rounded">
                        Not Supported
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* Format info */}
      {currentOption && (
        <p className="text-xs text-[var(--muted-foreground)]">
          {currentOption.description}
        </p>
      )}
    </div>
  )
}
