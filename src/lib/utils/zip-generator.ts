/**
 * ZIP generation utility for batch export
 * Uses JSZip library for archive creation with progress callback support
 * Requirements: 5.3, 5.4
 */

import JSZip from 'jszip'
import { generateCompressedFilename } from './file-helpers'
import type { OutputFormat } from '@/types'

/**
 * Image item to be added to the ZIP archive
 */
export interface ZipImageItem {
  /** The compressed image blob */
  blob: Blob
  /** Original filename for generating the archive entry name */
  originalFilename: string
  /** Output format for the file extension */
  format: OutputFormat
}

/**
 * Progress callback for ZIP generation
 * @param progress - Progress value from 0 to 100
 */
export type ZipProgressCallback = (progress: number) => void

/**
 * Result of ZIP generation
 */
export interface ZipGenerationResult {
  /** The generated ZIP blob */
  blob: Blob
  /** Total number of files in the archive */
  fileCount: number
  /** Total size of the ZIP in bytes */
  size: number
}

/**
 * Generates a ZIP archive containing all compressed images
 * @param images - Array of image items to include in the ZIP
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the ZIP generation result
 */
export async function generateZip(
  images: ZipImageItem[],
  onProgress?: ZipProgressCallback
): Promise<ZipGenerationResult> {
  const zip = new JSZip()

  // Track filenames to handle duplicates
  const usedFilenames = new Set<string>()

  // Add each image to the ZIP
  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    let filename = generateCompressedFilename(image.originalFilename, image.format)

    // Handle duplicate filenames by adding a suffix
    if (usedFilenames.has(filename)) {
      const baseName = filename.substring(0, filename.lastIndexOf('.'))
      const extension = filename.substring(filename.lastIndexOf('.'))
      let counter = 1
      while (usedFilenames.has(`${baseName}_${counter}${extension}`)) {
        counter++
      }
      filename = `${baseName}_${counter}${extension}`
    }

    usedFilenames.add(filename)
    zip.file(filename, image.blob)

    // Report progress for adding files (first 50% of progress)
    if (onProgress) {
      const addProgress = ((i + 1) / images.length) * 50
      onProgress(Math.round(addProgress))
    }
  }

  // Generate the ZIP blob with compression progress
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      // Report progress for compression (second 50% of progress)
      if (onProgress) {
        const compressionProgress = 50 + (metadata.percent / 2)
        onProgress(Math.round(compressionProgress))
      }
    }
  )

  return {
    blob,
    fileCount: images.length,
    size: blob.size,
  }
}

/**
 * Triggers a browser download for the ZIP file
 * @param blob - The ZIP blob to download
 * @param filename - The filename for the download (default: 'compressed_images.zip')
 */
export function downloadZip(blob: Blob, filename: string = 'compressed_images.zip'): void {
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
