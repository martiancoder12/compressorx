import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useImageStore } from '@/stores/images.store'
import { PreviewCard } from './PreviewCard'

interface ImagePreviewGridProps {
  className?: string
}

/**
 * ImagePreviewGrid component displays uploaded images in a grid layout
 * with individual remove buttons and a clear all action
 * Requirements: 1.5, 1.6, 1.7, 9.2, 9.3
 */
export function ImagePreviewGrid({ className }: ImagePreviewGridProps) {
  const images = useImageStore((state) => state.images)
  const removeImage = useImageStore((state) => state.removeImage)
  const clearAll = useImageStore((state) => state.clearAll)

  if (images.length === 0) {
    return null
  }

  return (
    <div className={cn('w-full', className)} role="region" aria-label="Uploaded images">
      {/* Header with Clear All */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[var(--foreground)]" id="uploaded-images-heading">
          Uploaded Images ({images.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={clearAll}
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          aria-label={`Clear all ${images.length} images`}
        >
          <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
          Clear All
        </Button>
      </div>

      {/* Image Grid */}
      <ul
        className={cn(
          'grid gap-4',
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        )}
        aria-labelledby="uploaded-images-heading"
      >
        {images.map((image) => (
          <li key={image.id}>
            <PreviewCard image={image} onRemove={removeImage} />
          </li>
        ))}
      </ul>
    </div>
  )
}
