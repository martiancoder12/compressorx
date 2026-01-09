import { create } from 'zustand'
import type { ProcessingQueueItem } from '../types'
import { MAX_CONCURRENT_PROCESSING } from '../types'

/**
 * Processing store state interface
 */
export interface ProcessingStoreState {
  queue: ProcessingQueueItem[]
  isProcessing: boolean
  addToQueue: (items: ProcessingQueueItem[]) => void
  updateQueueItem: (id: string, updates: Partial<ProcessingQueueItem>) => void
  removeFromQueue: (id: string) => void
  clearQueue: () => void
  getProcessingCount: () => number
  canStartProcessing: () => boolean
  startProcessing: (id: string) => boolean
}

/**
 * Processing store for managing the compression queue
 * Tracks processing state and enforces concurrent processing limit
 */
export const useProcessingStore = create<ProcessingStoreState>((set, get) => ({
  queue: [],
  isProcessing: false,

  addToQueue: (items: ProcessingQueueItem[]) => {
    set((state) => ({
      queue: [...state.queue, ...items],
      isProcessing: true,
    }))
  },

  updateQueueItem: (id: string, updates: Partial<ProcessingQueueItem>) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }))
  },

  removeFromQueue: (id: string) => {
    set((state) => {
      const newQueue = state.queue.filter((item) => item.id !== id)
      return {
        queue: newQueue,
        isProcessing: newQueue.some(
          (item) => item.status === 'queued' || item.status === 'processing'
        ),
      }
    })
  },

  clearQueue: () => {
    set({
      queue: [],
      isProcessing: false,
    })
  },

  getProcessingCount: () => {
    return get().queue.filter((item) => item.status === 'processing').length
  },

  canStartProcessing: () => {
    return get().getProcessingCount() < MAX_CONCURRENT_PROCESSING
  },

  startProcessing: (id: string) => {
    const state = get()
    const processingCount = state.getProcessingCount()

    // Enforce concurrent processing limit
    if (processingCount >= MAX_CONCURRENT_PROCESSING) {
      return false
    }

    const item = state.queue.find((item) => item.id === id)
    if (!item || item.status !== 'queued') {
      return false
    }

    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? { ...item, status: 'processing' as const, startTime: Date.now() }
          : item
      ),
    }))

    return true
  },
}))
