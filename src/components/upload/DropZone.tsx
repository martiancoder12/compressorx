import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useImageStore } from '@/stores/images.store'
import { validateFile } from '@/lib/utils/file-helpers'
import { MAX_FILE_SIZE } from '@/types'

interface DropZoneProps {
  disabled?: boolean
  className?: string
}

interface ValidationError {
  fileName: string
  error: string
}

/**
 * DropZone component for drag-and-drop image uploads
 * Supports multiple file selection and validates format/size
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export function DropZone({ disabled = false, className }: DropZoneProps) {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const addImages = useImageStore((state) => state.addImages)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      const errors: ValidationError[] = []
      const validFiles: File[] = []

      // Validate accepted files
      for (const file of acceptedFiles) {
        const result = validateFile(file)
        if (result.valid) {
          validFiles.push(file)
        } else {
          errors.push({ fileName: file.name, error: result.error || 'Unknown error' })
        }
      }

      // Handle rejected files from dropzone
      for (const rejection of rejectedFiles) {
        const errorMessages = rejection.errors.map((e) => e.message).join(', ')
        errors.push({ fileName: rejection.file.name, error: errorMessages })
      }

      // Add valid files to store
      if (validFiles.length > 0) {
        addImages(validFiles)
      }

      // Update validation errors
      setValidationErrors(errors)

      // Clear errors after 5 seconds
      if (errors.length > 0) {
        setTimeout(() => setValidationErrors([]), 5000)
      }
    },
    [addImages]
  )

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp'],
        'image/gif': ['.gif'],
        'image/bmp': ['.bmp'],
        'image/tiff': ['.tiff', '.tif'],
        'image/heic': ['.heic'],
      },
      maxSize: MAX_FILE_SIZE,
      disabled,
      multiple: true,
    })

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center w-full min-h-[200px] p-8',
          'border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200',
          'bg-[var(--muted)]/30 hover:bg-[var(--muted)]/50',
          'border-[var(--border)] hover:border-[var(--primary)]/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
          'focus-visible:border-[var(--ring)]',
          isDragActive && 'border-[var(--primary)] bg-[var(--primary)]/10',
          isDragAccept && 'border-green-500 bg-green-500/10',
          isDragReject && 'border-red-500 bg-red-500/10',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-[var(--muted)]/30'
        )}
        aria-label="Drop zone for image uploads. Click or drag and drop images here."
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <input {...getInputProps()} aria-label="File input" />
        
        <Upload
          className={cn(
            'w-12 h-12 mb-4 transition-colors',
            isDragActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
          )}
        />
        
        <p className="text-lg font-medium text-[var(--foreground)] mb-2">
          {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
        </p>
        
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          or click to browse
        </p>
        
        <p className="text-xs text-[var(--muted-foreground)]">
          Supports: JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC (max 50MB)
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 space-y-2" role="alert" aria-live="polite">
          {validationErrors.map((error, index) => (
            <div
              key={`${error.fileName}-${index}`}
              className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-red-500">{error.fileName}:</span>{' '}
                <span className="text-[var(--muted-foreground)]">{error.error}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
