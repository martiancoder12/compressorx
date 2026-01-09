/**
 * useCompression hook
 * Manages Web Worker lifecycle and handles image compression
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { CompressionOptions, CompressedResult, WorkerResponse } from '../types'
import { validateCompressionOptions } from '../lib/compression/compressor'

export interface UseCompressionReturn {
  compress: (file: File, options: CompressionOptions) => Promise<CompressedResult>
  cancel: () => void
  isProcessing: boolean
  progress: number
  error: string | null
}

/**
 * Hook for managing image compression via Web Worker
 */
export function useCompression(): UseCompressionReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingResolveRef = useRef<((result: CompressedResult) => void) | null>(null)
  const pendingRejectRef = useRef<((error: Error) => void) | null>(null)

  // Initialize worker
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/compression.worker.ts', import.meta.url),
        { type: 'module' }
      )

      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, data, error: workerError, progress: workerProgress } = event.data

        switch (type) {
          case 'progress':
            if (workerProgress !== undefined) {
              setProgress(workerProgress)
            }
            break

          case 'complete':
            if (data && pendingResolveRef.current) {
              setIsProcessing(false)
              setProgress(100)
              pendingResolveRef.current(data as CompressedResult)
              pendingResolveRef.current = null
              pendingRejectRef.current = null
            }
            break

          case 'error':
            if (pendingRejectRef.current) {
              setIsProcessing(false)
              setError(workerError || 'Unknown compression error')
              pendingRejectRef.current(new Error(workerError || 'Unknown compression error'))
              pendingResolveRef.current = null
              pendingRejectRef.current = null
            }
            break
        }
      }

      workerRef.current.onerror = (event) => {
        setIsProcessing(false)
        setError(event.message || 'Worker error')
        if (pendingRejectRef.current) {
          pendingRejectRef.current(new Error(event.message || 'Worker error'))
          pendingResolveRef.current = null
          pendingRejectRef.current = null
        }
      }
    }

    return workerRef.current
  }, [])

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  /**
   * Compress a single image file
   */
  const compress = useCallback(
    async (file: File, options: CompressionOptions): Promise<CompressedResult> => {
      // Validate options
      const validatedOptions = validateCompressionOptions(options)

      // Reset state
      setIsProcessing(true)
      setProgress(0)
      setError(null)

      // Create abort controller
      abortControllerRef.current = new AbortController()

      // Get worker
      const worker = getWorker()

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // Generate unique request ID
      const requestId = crypto.randomUUID()

      return new Promise<CompressedResult>((resolve, reject) => {
        // Store resolve/reject for worker callback
        pendingResolveRef.current = resolve
        pendingRejectRef.current = reject

        // Handle abort
        abortControllerRef.current?.signal.addEventListener('abort', () => {
          setIsProcessing(false)
          setError('Compression cancelled')
          reject(new Error('Compression cancelled'))
          pendingResolveRef.current = null
          pendingRejectRef.current = null
        })

        // Send message to worker
        worker.postMessage(
          {
            type: 'compress',
            id: requestId,
            imageData: arrayBuffer,
            options: validatedOptions,
          },
          [arrayBuffer] // Transfer ownership for performance
        )
      })
    },
    [getWorker]
  )

  /**
   * Cancel ongoing compression
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Terminate and recreate worker to cancel ongoing work
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    setIsProcessing(false)
    setProgress(0)
  }, [])

  return {
    compress,
    cancel,
    isProcessing,
    progress,
    error,
  }
}
