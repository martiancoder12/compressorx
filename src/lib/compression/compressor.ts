/**
 * Compression library wrapper
 * Provides high-level API for image compression using OffscreenCanvas
 */

import type { CompressionOptions, CompressedResult, OutputFormat } from '../../types'

/**
 * Check if AVIF format is supported by the browser
 */
export function canUseAVIF(): boolean {
  if (typeof OffscreenCanvas === 'undefined') {
    return false
  }

  try {
    const canvas = new OffscreenCanvas(1, 1)
    const ctx = canvas.getContext('2d')
    if (!ctx) return false

    // Test if AVIF encoding is supported
    // This is a synchronous check using a small test canvas
    return canvas.convertToBlob !== undefined
  } catch {
    return false
  }
}

/**
 * Check if a quality value is within valid bounds (0-100)
 */
export function isValidQuality(quality: number): boolean {
  return typeof quality === 'number' && !isNaN(quality) && quality >= 0 && quality <= 100
}

/**
 * Validate and clamp quality value to 0-100 range
 */
export function clampQuality(quality: number): number {
  if (typeof quality !== 'number' || isNaN(quality)) {
    return 70 // Default to balanced quality
  }
  return Math.max(0, Math.min(100, Math.round(quality)))
}

/**
 * Validate compression options
 */
export function validateCompressionOptions(options: CompressionOptions): CompressionOptions {
  return {
    ...options,
    quality: clampQuality(options.quality),
  }
}

/**
 * Get MIME type for output format
 */
function getMimeType(format: OutputFormat): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    default:
      return 'image/webp'
  }
}

/**
 * Calculate output dimensions with aspect ratio preservation
 */
function calculateOutputDimensions(
  originalWidth: number,
  originalHeight: number,
  options: CompressionOptions
): { width: number; height: number } {
  const { maxWidth, maxHeight, maintainAspectRatio } = options

  // Handle edge cases
  if (originalWidth <= 0 || originalHeight <= 0) {
    return { width: 0, height: 0 }
  }

  if (!maxWidth && !maxHeight) {
    return { width: originalWidth, height: originalHeight }
  }

  if (!maintainAspectRatio) {
    return {
      width: maxWidth ? Math.min(originalWidth, maxWidth) : originalWidth,
      height: maxHeight ? Math.min(originalHeight, maxHeight) : originalHeight,
    }
  }

  const aspectRatio = originalWidth / originalHeight
  let newWidth = originalWidth
  let newHeight = originalHeight

  if (maxWidth && newWidth > maxWidth) {
    newWidth = maxWidth
    newHeight = newWidth / aspectRatio
  }

  if (maxHeight && newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = newHeight * aspectRatio
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  }
}

/**
 * Compress an image file using OffscreenCanvas
 * This function runs on the main thread - for non-blocking compression, use the Web Worker
 */
export async function compressImage(
  file: File,
  options: CompressionOptions,
  onProgress?: (progress: number) => void
): Promise<CompressedResult> {
  // Validate options
  const validatedOptions = validateCompressionOptions(options)

  // Report initial progress
  onProgress?.(10)

  // Load image as ImageBitmap
  const imageBitmap = await createImageBitmap(file)
  onProgress?.(30)

  // Calculate output dimensions
  const { width, height } = calculateOutputDimensions(
    imageBitmap.width,
    imageBitmap.height,
    validatedOptions
  )

  // Handle zero dimensions
  if (width === 0 || height === 0) {
    imageBitmap.close()
    throw new Error('Invalid image dimensions')
  }

  // Create OffscreenCanvas
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    imageBitmap.close()
    throw new Error('Failed to get canvas context')
  }

  // Draw image to canvas
  ctx.drawImage(imageBitmap, 0, 0, width, height)
  onProgress?.(50)

  // Get MIME type and quality
  const mimeType = getMimeType(validatedOptions.format)
  const quality = validatedOptions.quality / 100 // Convert 0-100 to 0-1

  // Convert to blob
  let blob: Blob

  if (validatedOptions.format === 'png') {
    // PNG doesn't use quality parameter
    blob = await canvas.convertToBlob({ type: mimeType })
  } else {
    blob = await canvas.convertToBlob({ type: mimeType, quality })
  }

  onProgress?.(90)

  // Clean up
  imageBitmap.close()

  // Calculate metrics
  const originalSize = file.size
  const compressedSize = blob.size
  const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100

  onProgress?.(100)

  return {
    blob,
    originalSize,
    compressedSize,
    width,
    height,
    format: validatedOptions.format,
    compressionRatio: Math.max(0, Math.min(100, compressionRatio)),
  }
}

/**
 * Create a CompressedResult object with all required metrics
 * Useful for testing and validation
 */
export function createCompressedResult(
  blob: Blob,
  originalSize: number,
  width: number,
  height: number,
  format: OutputFormat
): CompressedResult {
  const compressedSize = blob.size
  const compressionRatio = originalSize > 0
    ? ((originalSize - compressedSize) / originalSize) * 100
    : 0

  return {
    blob,
    originalSize,
    compressedSize,
    width,
    height,
    format,
    compressionRatio: Math.max(0, Math.min(100, compressionRatio)),
  }
}

/**
 * Validate that a CompressedResult has all required fields with valid values
 */
export function isValidCompressedResult(result: unknown): result is CompressedResult {
  if (!result || typeof result !== 'object') {
    return false
  }

  const r = result as Record<string, unknown>

  return (
    r.blob instanceof Blob &&
    typeof r.originalSize === 'number' && r.originalSize > 0 &&
    typeof r.compressedSize === 'number' && r.compressedSize > 0 &&
    typeof r.width === 'number' && r.width > 0 &&
    typeof r.height === 'number' && r.height > 0 &&
    typeof r.format === 'string' && ['jpeg', 'png', 'webp', 'avif'].includes(r.format) &&
    typeof r.compressionRatio === 'number'
  )
}
