/**
 * Image file with processing state
 */
export interface ImageFile {
  id: string
  file: File
  preview: string // Object URL for preview
  status: 'pending' | 'processing' | 'complete' | 'error'
  compressed: CompressedResult | null
  error?: string
}

/**
 * Compression result containing the compressed blob and metrics
 */
export interface CompressedResult {
  blob: Blob
  originalSize: number
  compressedSize: number
  width: number
  height: number
  format: OutputFormat
  compressionRatio: number // percentage saved
}

/**
 * Output format options for compression
 */
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'

/**
 * Validation result for file uploads
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * History entry for IndexedDB storage
 */
export interface CompressionHistoryEntry {
  id: string
  timestamp: number
  originalName: string
  originalSize: number
  compressedSize: number
  format: OutputFormat
  quality: number
}
