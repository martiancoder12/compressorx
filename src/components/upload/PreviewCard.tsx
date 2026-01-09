import { useState } from 'react'
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/utils/file-helpers'
import type { ImageFile } from '@/types'

interface PreviewCardProps {
  image: ImageFile
  onRemove: (id: string) => void
}

/**
 * PreviewCard component displays an image thumbnail with status and remove action
 * Requirements: 1.5, 1.6, 9.2, 9.3
 */
export function PreviewCard({ image, onRemove }: PreviewCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  const statusIcon = {
    pending: null,
    processing: <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" aria-hidden="true" />,
    complete: <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />,
  }

  const statusText = {
    pending: 'Ready',
    processing: 'Compressing...',
    complete: 'Complete',
    error: image.error || 'Error',
  }

  const statusDescription = {
    pending: 'Ready for compression',
    processing: 'Currently being compressed',
    complete: 'Compression complete',
    error: `Error: ${image.error || 'Unknown error'}`,
  }

  return (
    <article
      className={cn(
        'relative group rounded-lg overflow-hidden',
        'border border-[var(--border)] bg-[var(--card)]',
        'transition-all duration-200 hover:shadow-md',
        image.status === 'error' && 'border-red-500/50'
      )}
      aria-label={`${image.file.name}, ${formatBytes(image.file.size)}, ${statusDescription[image.status]}`}
    >
      {/* Image Thumbnail */}
      <div className="relative aspect-square bg-[var(--muted)]">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}
        <img
          src={image.preview}
          alt={`Preview of ${image.file.name}`}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Remove Button */}
        <Button
          variant="destructive"
          size="icon"
          className={cn(
            'absolute top-2 right-2 w-7 h-7',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'focus:opacity-100'
          )}
          onClick={() => onRemove(image.id)}
          aria-label={`Remove ${image.file.name} from upload queue`}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>

        {/* Status Overlay */}
        {image.status === 'processing' && (
          <div 
            className="absolute inset-0 bg-black/30 flex items-center justify-center"
            role="status"
            aria-label="Compressing image"
          >
            <Loader2 className="w-8 h-8 animate-spin text-white" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3 space-y-1">
        <p
          className="text-sm font-medium text-[var(--foreground)] truncate"
          title={image.file.name}
        >
          {image.file.name}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatBytes(image.file.size)}
          </span>
          
          <div className="flex items-center gap-1.5" role="status" aria-label={statusDescription[image.status]}>
            {statusIcon[image.status]}
            <span
              className={cn(
                'text-xs',
                image.status === 'error'
                  ? 'text-red-500'
                  : image.status === 'complete'
                    ? 'text-green-500'
                    : 'text-[var(--muted-foreground)]'
              )}
            >
              {statusText[image.status]}
            </span>
          </div>
        </div>

        {/* Compression Result */}
        {image.compressed && (
          <div className="pt-1 border-t border-[var(--border)] mt-2" aria-label="Compression results">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Compressed:</span>
              <span className="text-green-500 font-medium">
                {formatBytes(image.compressed.compressedSize)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span className="text-[var(--muted-foreground)]">Saved:</span>
              <span className="text-green-500 font-medium">
                {image.compressed.compressionRatio.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
