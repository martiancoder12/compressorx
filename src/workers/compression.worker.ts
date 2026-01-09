/**
 * Web Worker for image compression
 * Handles image loading, Canvas-based compression, and format conversion
 */

import type { WorkerRequest, WorkerResponse, CompressionOptions, OutputFormat } from '../types'

// Worker context
const ctx: Worker = self as unknown as Worker

/**
 * Load image from ArrayBuffer
 */
async function loadImage(imageData: ArrayBuffer): Promise<ImageBitmap> {
  const blob = new Blob([imageData])
  return createImageBitmap(blob)
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
 * Compress image using OffscreenCanvas
 */
async function compressImage(
  imageBitmap: ImageBitmap,
  originalSize: number,
  options: CompressionOptions,
  requestId: string
): Promise<WorkerResponse['data']> {
  // Calculate output dimensions
  const { width, height } = calculateOutputDimensions(
    imageBitmap.width,
    imageBitmap.height,
    options
  )

  // Create OffscreenCanvas
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Draw image to canvas
  ctx.drawImage(imageBitmap, 0, 0, width, height)

  // Report progress
  postProgressMessage(requestId, 50)

  // Get MIME type and quality
  const mimeType = getMimeType(options.format)
  const quality = options.quality / 100 // Convert 0-100 to 0-1

  // Convert to blob
  let blob: Blob

  if (options.format === 'png') {
    // PNG doesn't use quality parameter
    blob = await canvas.convertToBlob({ type: mimeType })
  } else {
    blob = await canvas.convertToBlob({ type: mimeType, quality })
  }

  // Report progress
  postProgressMessage(requestId, 90)

  // Calculate compression ratio
  const compressedSize = blob.size
  const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100

  return {
    blob,
    originalSize,
    compressedSize,
    width,
    height,
    format: options.format,
    compressionRatio: Math.max(0, Math.min(100, compressionRatio)),
  }
}

/**
 * Post progress message to main thread
 */
function postProgressMessage(id: string, progress: number): void {
  const response: WorkerResponse = {
    type: 'progress',
    id,
    progress,
  }
  ctx.postMessage(response)
}

/**
 * Post complete message to main thread
 */
function postCompleteMessage(id: string, data: WorkerResponse['data']): void {
  const response: WorkerResponse = {
    type: 'complete',
    id,
    data,
  }
  ctx.postMessage(response)
}

/**
 * Post error message to main thread
 */
function postErrorMessage(id: string, error: string): void {
  const response: WorkerResponse = {
    type: 'error',
    id,
    error,
  }
  ctx.postMessage(response)
}

/**
 * Handle incoming messages from main thread
 */
ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, id, imageData, options } = event.data

  if (type !== 'compress') {
    postErrorMessage(id, `Unknown message type: ${type}`)
    return
  }

  try {
    // Report initial progress
    postProgressMessage(id, 10)

    // Load image from ArrayBuffer
    const imageBitmap = await loadImage(imageData)
    postProgressMessage(id, 30)

    // Compress image
    const result = await compressImage(imageBitmap, imageData.byteLength, options, id)

    // Clean up
    imageBitmap.close()

    // Send result
    postCompleteMessage(id, result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown compression error'
    postErrorMessage(id, errorMessage)
  }
}

// Export empty object for TypeScript module
export {}
