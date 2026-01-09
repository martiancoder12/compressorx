/**
 * DownloadButton component
 * Generates download link from Blob and triggers browser download
 * Requirements: 5.1, 5.2
 */

import { useCallback } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateCompressedFilename } from '@/lib/utils/file-helpers'
import { trackDownloadSingle } from '@/lib/analytics'
import type { OutputFormat } from '@/types'

export interface DownloadButtonProps {
  /** The compressed image blob to download */
  blob: Blob
  /** Original filename for generating the download name */
  originalFilename: string
  /** Output format for the file extension */
  format: OutputFormat
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Additional CSS classes */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Callback when download is triggered */
  onDownload?: () => void
}

/**
 * Button component that triggers a browser download for a compressed image
 */
export function DownloadButton({
  blob,
  originalFilename,
  format,
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
  onDownload,
}: DownloadButtonProps) {
  const handleDownload = useCallback(() => {
    // Generate the filename using the pattern: {name}_compressed.{format}
    const filename = generateCompressedFilename(originalFilename, format)

    // Create a download link from the Blob
    const url = URL.createObjectURL(blob)

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = filename

    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Revoke the object URL to free memory
    URL.revokeObjectURL(url)

    // Track download analytics
    trackDownloadSingle(format, blob.size / 1024)

    // Call the optional callback
    onDownload?.()
  }, [blob, originalFilename, format, onDownload])

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={handleDownload}
      aria-label={`Download ${originalFilename} as ${format}`}
    >
      <Download className="h-4 w-4" />
      {size !== 'icon' && <span>Download</span>}
    </Button>
  )
}
