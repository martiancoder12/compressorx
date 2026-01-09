export type {
  ImageFile,
  CompressedResult,
  OutputFormat,
  ValidationResult,
  CompressionHistoryEntry,
} from './image.types'

export type {
  CompressionOptions,
  QualityPreset,
  ProcessingQueueItem,
  WorkerRequest,
  WorkerResponse,
  SupportedMimeType,
} from './compression.types'

export {
  QUALITY_PRESETS,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_CONCURRENT_PROCESSING,
} from './compression.types'

export type { ThemeOption, PersistedSettings } from './settings.types'

export { DEFAULT_SETTINGS } from './settings.types'
