import type { OutputFormat, ValidationResult } from '../../types'
import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE } from '../../types'

/**
 * Validates a file for format and size requirements
 * @param file - The file to validate
 * @returns ValidationResult indicating if the file is valid
 */
export function validateFile(file: File): ValidationResult {
  // Check file size (max 50MB)
  if (file.size > MAX_FILE_SIZE) {
    const actualSize = formatBytes(file.size)
    return {
      valid: false,
      error: `File exceeds 50MB limit (${actualSize})`,
    }
  }

  // Check file format
  const mimeType = file.type as (typeof SUPPORTED_MIME_TYPES)[number]
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Unsupported format: ${file.type || 'unknown'}. Supported: JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC`,
    }
  }

  return { valid: true }
}

/**
 * Formats bytes into human-readable string
 * @param bytes - Number of bytes
 * @returns Human-readable string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  if (bytes < 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const index = Math.min(i, sizes.length - 1)

  const value = bytes / Math.pow(k, index)
  // Use 2 decimal places, but remove trailing zeros
  const formatted = value.toFixed(2).replace(/\.?0+$/, '')

  return `${formatted} ${sizes[index]}`
}

/**
 * Generates a compressed filename following the pattern: {name}_compressed.{format}
 * @param originalName - Original filename
 * @param format - Output format
 * @returns Generated filename
 */
export function generateCompressedFilename(
  originalName: string,
  format: OutputFormat
): string {
  // Remove the extension from the original filename
  const lastDotIndex = originalName.lastIndexOf('.')
  const baseName = lastDotIndex > 0 ? originalName.slice(0, lastDotIndex) : originalName

  // Map format to file extension
  const extension = format === 'jpeg' ? 'jpg' : format

  return `${baseName}_compressed.${extension}`
}


/**
 * Dimension constraints for image resizing
 */
export interface DimensionConstraints {
  maxWidth?: number
  maxHeight?: number
  maintainAspectRatio: boolean
}

/**
 * Original image dimensions
 */
export interface OriginalDimensions {
  width: number
  height: number
}

/**
 * Calculates output dimensions with aspect ratio preservation
 * @param original - Original image dimensions
 * @param options - Dimension constraints
 * @returns Calculated output dimensions
 */
export function calculateDimensions(
  original: OriginalDimensions,
  options: DimensionConstraints
): { width: number; height: number } {
  const { maxWidth, maxHeight, maintainAspectRatio } = options

  // Handle edge cases: zero or negative dimensions
  if (original.width <= 0 || original.height <= 0) {
    return { width: 0, height: 0 }
  }

  // If no constraints, return original dimensions
  if (!maxWidth && !maxHeight) {
    return { width: original.width, height: original.height }
  }

  // If not maintaining aspect ratio, just apply constraints directly
  if (!maintainAspectRatio) {
    return {
      width: maxWidth ? Math.min(original.width, maxWidth) : original.width,
      height: maxHeight ? Math.min(original.height, maxHeight) : original.height,
    }
  }

  // Calculate aspect ratio
  const aspectRatio = original.width / original.height

  let newWidth = original.width
  let newHeight = original.height

  // Apply maxWidth constraint
  if (maxWidth && newWidth > maxWidth) {
    newWidth = maxWidth
    newHeight = newWidth / aspectRatio
  }

  // Apply maxHeight constraint
  if (maxHeight && newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = newHeight * aspectRatio
  }

  // Round to integers
  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  }
}


/**
 * Compression indicator colors based on ratio thresholds
 */
export type CompressionIndicator = 'green' | 'yellow' | 'orange'

/**
 * Calculates the compression ratio as a percentage saved
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Compression ratio as percentage (0-100)
 */
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize <= 0) {
    return 0
  }

  const ratio = ((originalSize - compressedSize) / originalSize) * 100
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, ratio))
}

/**
 * Gets the compression indicator color based on the ratio
 * - Green: >60% reduction (excellent)
 * - Yellow: 30-60% reduction (good)
 * - Orange: <30% reduction (minimal)
 * 
 * @param ratio - Compression ratio as percentage
 * @returns Color indicator
 */
export function getCompressionIndicator(ratio: number): CompressionIndicator {
  if (ratio > 60) {
    return 'green'
  }
  if (ratio >= 30) {
    return 'yellow'
  }
  return 'orange'
}
