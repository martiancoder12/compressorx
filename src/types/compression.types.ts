import type { OutputFormat } from './image.types'

/**
 * Compression configuration options
 */
export interface CompressionOptions {
  quality: number // 0-100
  format: OutputFormat
  maxWidth?: number
  maxHeight?: number
  maintainAspectRatio: boolean
  stripMetadata: boolean
  progressive?: boolean // JPEG only
}

/**
 * Quality preset configuration
 */
export interface QualityPreset {
  name: string
  quality: number
  description: string
}

/**
 * Predefined quality presets
 */
export const QUALITY_PRESETS: QualityPreset[] = [
  { name: 'Maximum Compression', quality: 40, description: 'Smallest file size' },
  { name: 'Balanced', quality: 70, description: 'Good balance of size and quality' },
  { name: 'High Quality', quality: 85, description: 'Minimal quality loss' },
  { name: 'Lossless', quality: 100, description: 'PNG optimization only' },
]

/**
 * Processing queue item for batch operations
 */
export interface ProcessingQueueItem {
  id: string
  imageId: string
  status: 'queued' | 'processing' | 'complete' | 'error'
  progress: number // 0-100
  startTime?: number
  endTime?: number
}

/**
 * Worker request message type
 */
export interface WorkerRequest {
  type: 'compress'
  id: string
  imageData: ArrayBuffer
  options: CompressionOptions
}

/**
 * Worker response message type
 */
export interface WorkerResponse {
  type: 'complete' | 'error' | 'progress'
  id: string
  data?: {
    blob: Blob
    originalSize: number
    compressedSize: number
    width: number
    height: number
    format: OutputFormat
    compressionRatio: number
  }
  error?: string
  progress?: number
}

/**
 * Supported MIME types for image uploads
 */
export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/heic',
] as const

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number]

/**
 * Maximum file size in bytes (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * Maximum concurrent processing limit
 */
export const MAX_CONCURRENT_PROCESSING = 4
