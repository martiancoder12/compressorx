import { cn } from '@/lib/utils'
import { formatBytes, getCompressionIndicator } from '@/lib/utils/file-helpers'
import type { OutputFormat } from '@/types'

interface MetricsPanelProps {
  original: {
    size: number
    width: number
    height: number
  }
  compressed: {
    size: number
    width: number
    height: number
    format: OutputFormat
    compressionRatio: number
  } | null
}

/**
 * MetricsPanel component displays compression statistics with color-coded indicators
 * Requirements: 3.4, 3.5, 3.6, 3.7, 9.2, 9.3
 */
export function MetricsPanel({ original, compressed }: MetricsPanelProps) {
  const indicator = compressed ? getCompressionIndicator(compressed.compressionRatio) : null

  const indicatorColors = {
    green: {
      bg: 'bg-[var(--color-compression-green)]',
      text: 'text-[var(--color-compression-green)]',
      label: 'Excellent',
    },
    yellow: {
      bg: 'bg-[var(--color-compression-yellow)]',
      text: 'text-[var(--color-compression-yellow)]',
      label: 'Good',
    },
    orange: {
      bg: 'bg-[var(--color-compression-orange)]',
      text: 'text-[var(--color-compression-orange)]',
      label: 'Minimal',
    },
  }

  return (
    <section 
      className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
      aria-labelledby="metrics-heading"
    >
      <h4 id="metrics-heading" className="text-sm font-semibold text-[var(--foreground)] mb-3">
        Compression Metrics
      </h4>

      <div className="grid grid-cols-2 gap-4" role="group" aria-label="Size comparison">
        {/* Original Stats */}
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
            Original
          </h5>
          <dl className="space-y-1">
            <MetricRow label="Size" value={formatBytes(original.size)} />
            <MetricRow
              label="Dimensions"
              value={`${original.width} × ${original.height}`}
            />
          </dl>
        </div>

        {/* Compressed Stats */}
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
            Compressed
          </h5>
          {compressed ? (
            <dl className="space-y-1">
              <MetricRow
                label="Size"
                value={formatBytes(compressed.size)}
                highlight
              />
              <MetricRow
                label="Dimensions"
                value={`${compressed.width} × ${compressed.height}`}
              />
              <MetricRow
                label="Format"
                value={compressed.format.toUpperCase()}
              />
            </dl>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              Not yet compressed
            </p>
          )}
        </div>
      </div>

      {/* Compression Ratio Section */}
      {compressed && indicator && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]" role="region" aria-label="Compression ratio results">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Compression Ratio
              </span>
              <div className="flex items-center gap-2">
                <span 
                  className={cn('text-2xl font-bold', indicatorColors[indicator].text)}
                  aria-label={`${compressed.compressionRatio.toFixed(1)} percent saved`}
                >
                  {compressed.compressionRatio.toFixed(1)}%
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  saved
                </span>
              </div>
            </div>

            {/* Quality Indicator Badge */}
            <div className="flex flex-col items-end gap-1">
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-white text-xs font-medium',
                  indicatorColors[indicator].bg
                )}
                role="status"
                aria-label={`Compression quality: ${indicatorColors[indicator].label}`}
              >
                {indicatorColors[indicator].label}
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                {indicator === 'green' && '>60% reduction'}
                {indicator === 'yellow' && '30-60% reduction'}
                {indicator === 'orange' && '<30% reduction'}
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="mt-3" role="img" aria-label={`Compression ratio visualization: ${compressed.compressionRatio.toFixed(1)}%`}>
            <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', indicatorColors[indicator].bg)}
                style={{ width: `${Math.min(100, compressed.compressionRatio)}%` }}
              />
            </div>
          </div>

          {/* Size Comparison */}
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted-foreground)]" aria-hidden="true">
            <span>{formatBytes(original.size)}</span>
            <span>→</span>
            <span className={indicatorColors[indicator].text}>
              {formatBytes(compressed.size)}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}

interface MetricRowProps {
  label: string
  value: string
  highlight?: boolean
}

function MetricRow({ label, value, highlight }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd
        className={cn(
          'text-sm font-medium',
          highlight ? 'text-[var(--color-compression-green)]' : 'text-[var(--foreground)]'
        )}
      >
        {value}
      </dd>
    </div>
  )
}
