import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { useProcessingStore } from './processing.store'
import type { ProcessingQueueItem } from '../types'
import { MAX_CONCURRENT_PROCESSING } from '../types'

// Helper to create a mock ProcessingQueueItem
function createQueueItem(
  overrides: Partial<ProcessingQueueItem> = {}
): ProcessingQueueItem {
  return {
    id: crypto.randomUUID(),
    imageId: crypto.randomUUID(),
    status: 'queued',
    progress: 0,
    ...overrides,
  }
}

// Reset store before each test
beforeEach(() => {
  useProcessingStore.setState({ queue: [], isProcessing: false })
})

/**
 * Feature: compressorx, Property 9: Concurrent Processing Limit
 *
 * For any state of the processing queue, the number of items with status 'processing'
 * SHALL never exceed 4.
 *
 * Validates: Requirements 4.5
 */
describe('Feature: compressorx, Property 9: Concurrent Processing Limit', () => {
  it('processing items never exceed MAX_CONCURRENT_PROCESSING (4)', () => {
    fc.assert(
      fc.property(
        // Generate between 1 and 20 queue items to add
        fc.integer({ min: 1, max: 20 }),
        // Generate number of items to attempt to start processing
        fc.integer({ min: 1, max: 25 }),
        (numItems, numStartAttempts) => {
          // Reset store
          useProcessingStore.setState({ queue: [], isProcessing: false })

          // Create queue items
          const items = Array.from({ length: numItems }, () => createQueueItem())
          useProcessingStore.getState().addToQueue(items)

          // Attempt to start processing on random items
          const queue = useProcessingStore.getState().queue
          for (let i = 0; i < numStartAttempts; i++) {
            const randomIndex = Math.floor(Math.random() * queue.length)
            const item = queue[randomIndex]
            if (item && item.status === 'queued') {
              useProcessingStore.getState().startProcessing(item.id)
            }
          }

          // Count processing items
          const processingCount = useProcessingStore.getState().getProcessingCount()

          // Verify: processing count never exceeds limit
          return processingCount <= MAX_CONCURRENT_PROCESSING
        }
      ),
      { numRuns: 100 }
    )
  })

  it('startProcessing returns false when limit is reached', () => {
    fc.assert(
      fc.property(
        // Generate more items than the limit
        fc.integer({ min: MAX_CONCURRENT_PROCESSING + 1, max: 15 }),
        (numItems) => {
          // Reset store
          useProcessingStore.setState({ queue: [], isProcessing: false })

          // Create queue items
          const items = Array.from({ length: numItems }, () => createQueueItem())
          useProcessingStore.getState().addToQueue(items)

          const queue = useProcessingStore.getState().queue

          // Start processing up to the limit
          let successCount = 0
          for (let i = 0; i < numItems; i++) {
            const result = useProcessingStore.getState().startProcessing(queue[i].id)
            if (result) {
              successCount++
            }
          }

          // Verify: exactly MAX_CONCURRENT_PROCESSING items started successfully
          return successCount === MAX_CONCURRENT_PROCESSING
        }
      ),
      { numRuns: 100 }
    )
  })

  it('processing count stays within limit after multiple operations', () => {
    fc.assert(
      fc.property(
        // Generate a sequence of operations
        fc.array(
          fc.oneof(
            fc.constant('add'),
            fc.constant('start'),
            fc.constant('complete'),
            fc.constant('remove')
          ),
          { minLength: 5, maxLength: 30 }
        ),
        (operations) => {
          // Reset store
          useProcessingStore.setState({ queue: [], isProcessing: false })

          // Track added item IDs
          const addedIds: string[] = []

          for (const op of operations) {
            const queue = useProcessingStore.getState().queue

            switch (op) {
              case 'add': {
                const item = createQueueItem()
                useProcessingStore.getState().addToQueue([item])
                addedIds.push(item.id)
                break
              }
              case 'start': {
                // Try to start a queued item
                const queuedItem = queue.find((i) => i.status === 'queued')
                if (queuedItem) {
                  useProcessingStore.getState().startProcessing(queuedItem.id)
                }
                break
              }
              case 'complete': {
                // Complete a processing item
                const processingItem = queue.find((i) => i.status === 'processing')
                if (processingItem) {
                  useProcessingStore.getState().updateQueueItem(processingItem.id, {
                    status: 'complete',
                    progress: 100,
                    endTime: Date.now(),
                  })
                }
                break
              }
              case 'remove': {
                // Remove a random item
                if (queue.length > 0) {
                  const randomIndex = Math.floor(Math.random() * queue.length)
                  useProcessingStore.getState().removeFromQueue(queue[randomIndex].id)
                }
                break
              }
            }

            // After each operation, verify the invariant
            const processingCount = useProcessingStore.getState().getProcessingCount()
            if (processingCount > MAX_CONCURRENT_PROCESSING) {
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('canStartProcessing returns correct value based on current processing count', () => {
    // Reset store
    useProcessingStore.setState({ queue: [], isProcessing: false })

    // Add items
    const items = Array.from({ length: 6 }, () => createQueueItem())
    useProcessingStore.getState().addToQueue(items)

    const queue = useProcessingStore.getState().queue

    // Initially should be able to start processing
    expect(useProcessingStore.getState().canStartProcessing()).toBe(true)

    // Start processing up to the limit
    for (let i = 0; i < MAX_CONCURRENT_PROCESSING; i++) {
      useProcessingStore.getState().startProcessing(queue[i].id)
    }

    // Now should not be able to start more
    expect(useProcessingStore.getState().canStartProcessing()).toBe(false)

    // Complete one item
    useProcessingStore.getState().updateQueueItem(queue[0].id, {
      status: 'complete',
      progress: 100,
    })

    // Now should be able to start again
    expect(useProcessingStore.getState().canStartProcessing()).toBe(true)
  })
})

// Additional unit tests for queue management
describe('Processing Store - Queue Management', () => {
  it('addToQueue adds items and sets isProcessing to true', () => {
    const items = [createQueueItem(), createQueueItem()]
    useProcessingStore.getState().addToQueue(items)

    const state = useProcessingStore.getState()
    expect(state.queue).toHaveLength(2)
    expect(state.isProcessing).toBe(true)
  })

  it('updateQueueItem updates only the specified item', () => {
    const items = [createQueueItem(), createQueueItem()]
    useProcessingStore.getState().addToQueue(items)

    const queue = useProcessingStore.getState().queue
    const targetId = queue[0].id

    useProcessingStore.getState().updateQueueItem(targetId, {
      progress: 50,
      status: 'processing',
    })

    const updatedQueue = useProcessingStore.getState().queue
    expect(updatedQueue[0].progress).toBe(50)
    expect(updatedQueue[0].status).toBe('processing')
    expect(updatedQueue[1].progress).toBe(0)
    expect(updatedQueue[1].status).toBe('queued')
  })

  it('removeFromQueue removes the specified item', () => {
    const items = [createQueueItem(), createQueueItem(), createQueueItem()]
    useProcessingStore.getState().addToQueue(items)

    const queue = useProcessingStore.getState().queue
    const idToRemove = queue[1].id
    const remainingIds = [queue[0].id, queue[2].id]

    useProcessingStore.getState().removeFromQueue(idToRemove)

    const updatedQueue = useProcessingStore.getState().queue
    expect(updatedQueue).toHaveLength(2)
    expect(updatedQueue.map((i) => i.id)).toEqual(remainingIds)
  })

  it('clearQueue empties the queue and sets isProcessing to false', () => {
    const items = [createQueueItem(), createQueueItem()]
    useProcessingStore.getState().addToQueue(items)

    useProcessingStore.getState().clearQueue()

    const state = useProcessingStore.getState()
    expect(state.queue).toHaveLength(0)
    expect(state.isProcessing).toBe(false)
  })

  it('startProcessing sets startTime when starting', () => {
    const item = createQueueItem()
    useProcessingStore.getState().addToQueue([item])

    const before = Date.now()
    useProcessingStore.getState().startProcessing(item.id)
    const after = Date.now()

    const queue = useProcessingStore.getState().queue
    expect(queue[0].status).toBe('processing')
    expect(queue[0].startTime).toBeGreaterThanOrEqual(before)
    expect(queue[0].startTime).toBeLessThanOrEqual(after)
  })

  it('startProcessing returns false for non-queued items', () => {
    const item = createQueueItem({ status: 'complete' })
    useProcessingStore.getState().addToQueue([item])

    const result = useProcessingStore.getState().startProcessing(item.id)
    expect(result).toBe(false)
  })

  it('startProcessing returns false for non-existent items', () => {
    const result = useProcessingStore.getState().startProcessing('non-existent-id')
    expect(result).toBe(false)
  })
})
