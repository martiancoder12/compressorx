/**
 * useBatchProcessing hook
 * Manages batch compression with worker pool and concurrency control
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { CompressionOptions, CompressedResult, WorkerResponse, ProcessingQueueItem } from '../types'
import { MAX_CONCURRENT_PROCESSING } from '../types'
import { validateCompressionOptions } from '../lib/compression/compressor'
import { useProcessingStore } from '../stores/processing.store'
import { useImageStore } from '../stores/images.store'
import { trackCompressionComplete, trackBatchCompressionComplete } from '../lib/analytics'

export interface BatchProcessingProgress {
  imageId: string
  progress: number
  status: 'queued' | 'processing' | 'complete' | 'error'
}

export interface UseBatchProcessingReturn {
  processBatch: (imageIds: string[], options: CompressionOptions) => void
  cancel: () => void
  isProcessing: boolean
  overallProgress: number
  individualProgress: Map<string, BatchProcessingProgress>
  completedCount: number
  totalCount: number
  error: string | null
}

interface WorkerInstance {
  worker: Worker
  busy: boolean
  currentImageId: string | null
}

/**
 * Hook for managing batch image compression with worker pool
 */
export function useBatchProcessing(): UseBatchProcessingReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [individualProgress, setIndividualProgress] = useState<Map<string, BatchProcessingProgress>>(new Map())
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const workerPoolRef = useRef<WorkerInstance[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingQueueRef = useRef<{ imageId: string; file: File }[]>([])
  const optionsRef = useRef<CompressionOptions | null>(null)
  // Refs to hold functions to avoid hoisting issues with callbacks
  const checkCompletionRef = useRef<() => void>(() => {})
  const processNextInQueueRef = useRef<() => void>(() => {})

  const { addToQueue, updateQueueItem, clearQueue } = useProcessingStore()
  const { images, updateStatus, updateCompressed, setError: setImageError } = useImageStore()

  // Initialize worker pool
  const initializeWorkerPool = useCallback(() => {
    // Terminate existing workers
    workerPoolRef.current.forEach(({ worker }) => worker.terminate())
    workerPoolRef.current = []

    // Create new worker pool
    for (let i = 0; i < MAX_CONCURRENT_PROCESSING; i++) {
      const worker = new Worker(
        new URL('../workers/compression.worker.ts', import.meta.url),
        { type: 'module' }
      )
      workerPoolRef.current.push({
        worker,
        busy: false,
        currentImageId: null,
      })
    }
  }, [])

  // Get an available worker from the pool
  const getAvailableWorker = useCallback((): WorkerInstance | null => {
    return workerPoolRef.current.find((w) => !w.busy) || null
  }, [])

  // Process next item in queue
  const processNextInQueue = useCallback(() => {
    if (abortControllerRef.current?.signal.aborted) {
      return
    }

    const availableWorker = getAvailableWorker()
    if (!availableWorker || pendingQueueRef.current.length === 0) {
      return
    }

    const nextItem = pendingQueueRef.current.shift()
    if (!nextItem || !optionsRef.current) {
      return
    }

    const { imageId, file } = nextItem
    const options = optionsRef.current

    // Mark worker as busy
    availableWorker.busy = true
    availableWorker.currentImageId = imageId

    // Update progress state
    setIndividualProgress((prev) => {
      const newMap = new Map(prev)
      newMap.set(imageId, { imageId, progress: 0, status: 'processing' })
      return newMap
    })

    // Update store status
    updateStatus(imageId, 'processing')
    updateQueueItem(imageId, { status: 'processing', startTime: Date.now() })

    // Set up worker message handler
    const handleMessage = async (event: MessageEvent<WorkerResponse>) => {
      const { type, data, error: workerError, progress: workerProgress } = event.data

      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      switch (type) {
        case 'progress':
          if (workerProgress !== undefined) {
            setIndividualProgress((prev) => {
              const newMap = new Map(prev)
              const current = newMap.get(imageId)
              if (current) {
                newMap.set(imageId, { ...current, progress: workerProgress })
              }
              return newMap
            })
            updateQueueItem(imageId, { progress: workerProgress })
          }
          break

        case 'complete':
          if (data) {
            const result: CompressedResult = {
              blob: data.blob,
              originalSize: data.originalSize,
              compressedSize: data.compressedSize,
              width: data.width,
              height: data.height,
              format: data.format,
              compressionRatio: data.compressionRatio,
            }

            setIndividualProgress((prev) => {
              const newMap = new Map(prev)
              newMap.set(imageId, { imageId, progress: 100, status: 'complete' })
              return newMap
            })

            setCompletedCount((prev) => prev + 1)
            updateCompressed(imageId, result)
            updateQueueItem(imageId, { status: 'complete', progress: 100, endTime: Date.now() })

            // Track individual compression completion
            trackCompressionComplete({
              format: result.format,
              quality: options.quality,
              originalSizeKB: result.originalSize / 1024,
              compressedSizeKB: result.compressedSize / 1024,
              compressionRatio: result.compressionRatio,
            })
          }

          // Release worker
          availableWorker.busy = false
          availableWorker.currentImageId = null
          availableWorker.worker.onmessage = null

          // Process next item
          processNextInQueueRef.current()

          // Check if all done
          checkCompletionRef.current()
          break

        case 'error':
          setIndividualProgress((prev) => {
            const newMap = new Map(prev)
            newMap.set(imageId, { imageId, progress: 0, status: 'error' })
            return newMap
          })

          setImageError(imageId, workerError || 'Compression failed')
          updateQueueItem(imageId, { status: 'error', endTime: Date.now() })

          // Release worker
          availableWorker.busy = false
          availableWorker.currentImageId = null
          availableWorker.worker.onmessage = null

          // Process next item
          processNextInQueueRef.current()

          // Check if all done
          checkCompletionRef.current()
          break
      }
    }

    availableWorker.worker.onmessage = handleMessage

    // Read file and send to worker
    file.arrayBuffer().then((arrayBuffer) => {
      if (abortControllerRef.current?.signal.aborted) {
        availableWorker.busy = false
        availableWorker.currentImageId = null
        return
      }

      availableWorker.worker.postMessage(
        {
          type: 'compress',
          id: imageId,
          imageData: arrayBuffer,
          options: validateCompressionOptions(options),
        },
        [arrayBuffer]
      )
    }).catch((err) => {
      setIndividualProgress((prev) => {
        const newMap = new Map(prev)
        newMap.set(imageId, { imageId, progress: 0, status: 'error' })
        return newMap
      })
      setImageError(imageId, `Failed to read file: ${err.message}`)
      updateQueueItem(imageId, { status: 'error', endTime: Date.now() })

      availableWorker.busy = false
      availableWorker.currentImageId = null

      processNextInQueueRef.current()
      checkCompletionRef.current()
    })
  }, [getAvailableWorker, updateStatus, updateCompressed, setImageError, updateQueueItem])

  // Track batch completion analytics
  const trackBatchAnalytics = useCallback(() => {
    if (!optionsRef.current) return

    // Get all completed images from the store
    const completedImages = images.filter(
      (img) => img.status === 'complete' && img.compressed
    )

    if (completedImages.length < 2) return

    // Calculate totals
    let totalOriginalSize = 0
    let totalCompressedSize = 0
    let totalRatio = 0

    completedImages.forEach((img) => {
      if (img.compressed) {
        totalOriginalSize += img.compressed.originalSize
        totalCompressedSize += img.compressed.compressedSize
        totalRatio += img.compressed.compressionRatio
      }
    })

    trackBatchCompressionComplete({
      batchSize: completedImages.length,
      format: optionsRef.current.format,
      quality: optionsRef.current.quality,
      totalOriginalSizeKB: totalOriginalSize / 1024,
      totalCompressedSizeKB: totalCompressedSize / 1024,
      averageCompressionRatio: totalRatio / completedImages.length,
    })
  }, [images])

  // Check if batch processing is complete
  const checkCompletion = useCallback(() => {
    const allWorkersIdle = workerPoolRef.current.every((w) => !w.busy)
    const queueEmpty = pendingQueueRef.current.length === 0

    if (allWorkersIdle && queueEmpty) {
      setIsProcessing(false)
      // Track batch completion analytics
      trackBatchAnalytics()
    }
  }, [trackBatchAnalytics])

  // Keep refs in sync - use useEffect to avoid "cannot update ref during render"
  useEffect(() => {
    checkCompletionRef.current = checkCompletion
    processNextInQueueRef.current = processNextInQueue
  })

  // Derive overall progress from individual progress (avoids setState-in-effect)
  const overallProgress = useMemo(() => {
    if (totalCount === 0) {
      return 0
    }

    let totalProgress = 0
    individualProgress.forEach((item) => {
      totalProgress += item.progress
    })

    return Math.round(totalProgress / totalCount)
  }, [individualProgress, totalCount])

  /**
   * Process a batch of images with shared compression settings
   */
  const processBatch = useCallback(
    (imageIds: string[], options: CompressionOptions) => {
      if (imageIds.length === 0) {
        return
      }

      // Reset state
      setIsProcessing(true)
      setError(null)
      setCompletedCount(0)
      setTotalCount(imageIds.length)
      setIndividualProgress(new Map())

      // Store validated options (shared across all images)
      optionsRef.current = validateCompressionOptions(options)

      // Create abort controller
      abortControllerRef.current = new AbortController()

      // Initialize worker pool
      initializeWorkerPool()

      // Build pending queue with files
      const queueItems: ProcessingQueueItem[] = []
      pendingQueueRef.current = []

      for (const imageId of imageIds) {
        const image = images.find((img) => img.id === imageId)
        if (image && image.status !== 'complete') {
          pendingQueueRef.current.push({ imageId, file: image.file })
          queueItems.push({
            id: imageId,
            imageId,
            status: 'queued',
            progress: 0,
          })

          // Initialize individual progress
          setIndividualProgress((prev) => {
            const newMap = new Map(prev)
            newMap.set(imageId, { imageId, progress: 0, status: 'queued' })
            return newMap
          })
        }
      }

      // Add to processing store
      addToQueue(queueItems)

      // Start processing (up to MAX_CONCURRENT_PROCESSING at once)
      for (let i = 0; i < MAX_CONCURRENT_PROCESSING; i++) {
        processNextInQueue()
      }
    },
    [images, initializeWorkerPool, addToQueue, processNextInQueue]
  )

  /**
   * Cancel all ongoing batch processing
   */
  const cancel = useCallback(() => {
    // Signal abort
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Clear pending queue
    pendingQueueRef.current = []

    // Terminate all workers
    workerPoolRef.current.forEach(({ worker }) => worker.terminate())
    workerPoolRef.current = []

    // Update state for any processing items
    individualProgress.forEach((item, imageId) => {
      if (item.status === 'processing' || item.status === 'queued') {
        updateStatus(imageId, 'pending')
        setIndividualProgress((prev) => {
          const newMap = new Map(prev)
          newMap.set(imageId, { ...item, status: 'error', progress: 0 })
          return newMap
        })
      }
    })

    // Clear processing store
    clearQueue()

    // Reset state
    setIsProcessing(false)
    setError('Batch processing cancelled')
  }, [individualProgress, updateStatus, clearQueue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      workerPoolRef.current.forEach(({ worker }) => worker.terminate())
      workerPoolRef.current = []
    }
  }, [])

  return {
    processBatch,
    cancel,
    isProcessing,
    overallProgress,
    individualProgress,
    completedCount,
    totalCount,
    error,
  }
}
