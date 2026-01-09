import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { useImageStore } from './images.store'
import type { CompressedResult, OutputFormat } from '../types'

// Helper to create a mock File object
function createMockFile(name = 'test.jpg', size = 1024): File {
  const blob = new Blob([new ArrayBuffer(size)], { type: 'image/jpeg' })
  return new File([blob], name, { type: 'image/jpeg' })
}

// Helper to create a mock CompressedResult
function createMockCompressedResult(overrides: Partial<CompressedResult> = {}): CompressedResult {
  return {
    blob: new Blob([new ArrayBuffer(512)], { type: 'image/webp' }),
    originalSize: 1024,
    compressedSize: 512,
    width: 800,
    height: 600,
    format: 'webp' as OutputFormat,
    compressionRatio: 50,
    ...overrides,
  }
}

// Reset store before each test
beforeEach(() => {
  useImageStore.setState({ images: [] })
})

/**
 * Feature: compressorx, Property 2: Image Removal Preserves Others
 *
 * For any list of images and any valid image ID in that list, removing that image SHALL result in a list that:
 * - Does not contain the removed image
 * - Contains all other images from the original list in the same order
 *
 * Validates: Requirements 1.6
 */
describe('Feature: compressorx, Property 2: Image Removal Preserves Others', () => {
  it('removing an image preserves all other images in the same order', () => {
    fc.assert(
      fc.property(
        // Generate between 1 and 10 files
        fc.integer({ min: 1, max: 10 }),
        (numFiles) => {
          // Reset store
          useImageStore.setState({ images: [] })

          // Create and add files
          const files = Array.from({ length: numFiles }, (_, i) =>
            createMockFile(`test${i}.jpg`, 1024 + i)
          )
          useImageStore.getState().addImages(files)

          // Get the images after adding
          const imagesBeforeRemoval = useImageStore.getState().images
          
          // Pick a random index to remove
          const indexToRemove = Math.floor(Math.random() * numFiles)
          const idToRemove = imagesBeforeRemoval[indexToRemove].id
          const idsBeforeRemoval = imagesBeforeRemoval.map((img) => img.id)

          // Remove the image
          useImageStore.getState().removeImage(idToRemove)

          // Get images after removal
          const imagesAfterRemoval = useImageStore.getState().images
          const idsAfterRemoval = imagesAfterRemoval.map((img) => img.id)

          // Verify: removed image is not in the list
          const removedImageNotPresent = !idsAfterRemoval.includes(idToRemove)

          // Verify: all other images are present in the same order
          const expectedIds = idsBeforeRemoval.filter((id) => id !== idToRemove)
          const orderPreserved =
            idsAfterRemoval.length === expectedIds.length &&
            idsAfterRemoval.every((id, index) => id === expectedIds[index])

          return removedImageNotPresent && orderPreserved
        }
      ),
      { numRuns: 100 }
    )
  })

  it('removing a non-existent ID does not change the list', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (numFiles) => {
          // Reset store
          useImageStore.setState({ images: [] })

          // Create and add files
          const files = Array.from({ length: numFiles }, (_, i) =>
            createMockFile(`test${i}.jpg`, 1024 + i)
          )
          useImageStore.getState().addImages(files)

          const imagesBefore = useImageStore.getState().images
          const idsBefore = imagesBefore.map((img) => img.id)

          // Try to remove a non-existent ID
          useImageStore.getState().removeImage('non-existent-id')

          const imagesAfter = useImageStore.getState().images
          const idsAfter = imagesAfter.map((img) => img.id)

          // List should be unchanged
          return (
            idsBefore.length === idsAfter.length &&
            idsBefore.every((id, index) => id === idsAfter[index])
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: compressorx, Property 3: Clear All Empties List
 *
 * For any list of images (including empty lists), calling clear all SHALL result in an empty list.
 *
 * Validates: Requirements 1.7
 */
describe('Feature: compressorx, Property 3: Clear All Empties List', () => {
  it('clearAll always results in an empty list regardless of initial size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (numFiles) => {
          // Reset store
          useImageStore.setState({ images: [] })

          // Create and add files
          const files = Array.from({ length: numFiles }, (_, i) =>
            createMockFile(`test${i}.jpg`, 1024 + i)
          )
          if (files.length > 0) {
            useImageStore.getState().addImages(files)
          }

          // Verify we have the expected number of images
          const imagesBefore = useImageStore.getState().images
          if (imagesBefore.length !== numFiles) {
            return false
          }

          // Clear all
          useImageStore.getState().clearAll()

          // Verify the list is empty
          const imagesAfter = useImageStore.getState().images
          return imagesAfter.length === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  it('clearAll on an already empty list remains empty', () => {
    useImageStore.setState({ images: [] })
    useImageStore.getState().clearAll()
    expect(useImageStore.getState().images).toEqual([])
  })

  it('clearAll is idempotent - calling multiple times has same effect', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (numFiles, clearCalls) => {
          // Reset store
          useImageStore.setState({ images: [] })

          // Create and add files
          const files = Array.from({ length: numFiles }, (_, i) =>
            createMockFile(`test${i}.jpg`, 1024 + i)
          )
          if (files.length > 0) {
            useImageStore.getState().addImages(files)
          }

          // Call clearAll multiple times
          for (let i = 0; i < clearCalls; i++) {
            useImageStore.getState().clearAll()
          }

          // Should always be empty
          return useImageStore.getState().images.length === 0
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Additional unit tests for state transitions
describe('Images Store - State Transitions', () => {
  it('addImages creates ImageFile objects with correct initial state', () => {
    const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')]
    useImageStore.getState().addImages(files)

    const images = useImageStore.getState().images
    expect(images).toHaveLength(2)

    images.forEach((img, index) => {
      expect(img.id).toBeDefined()
      expect(img.file).toBe(files[index])
      expect(img.preview).toBe('blob:mock-url')
      expect(img.status).toBe('pending')
      expect(img.compressed).toBeNull()
      expect(img.error).toBeUndefined()
    })
  })

  it('updateStatus changes only the status of the specified image', () => {
    const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')]
    useImageStore.getState().addImages(files)

    const images = useImageStore.getState().images
    const targetId = images[0].id

    useImageStore.getState().updateStatus(targetId, 'processing')

    const updatedImages = useImageStore.getState().images
    expect(updatedImages[0].status).toBe('processing')
    expect(updatedImages[1].status).toBe('pending')
  })

  it('updateCompressed sets compressed result and status to complete', () => {
    const files = [createMockFile('test.jpg')]
    useImageStore.getState().addImages(files)

    const images = useImageStore.getState().images
    const targetId = images[0].id
    const result = createMockCompressedResult()

    useImageStore.getState().updateCompressed(targetId, result)

    const updatedImages = useImageStore.getState().images
    expect(updatedImages[0].compressed).toEqual(result)
    expect(updatedImages[0].status).toBe('complete')
  })

  it('setError sets error message and status to error', () => {
    const files = [createMockFile('test.jpg')]
    useImageStore.getState().addImages(files)

    const images = useImageStore.getState().images
    const targetId = images[0].id
    const errorMessage = 'Compression failed'

    useImageStore.getState().setError(targetId, errorMessage)

    const updatedImages = useImageStore.getState().images
    expect(updatedImages[0].error).toBe(errorMessage)
    expect(updatedImages[0].status).toBe('error')
  })

  it('each image gets a unique ID', () => {
    const files = Array.from({ length: 10 }, (_, i) =>
      createMockFile(`test${i}.jpg`)
    )
    useImageStore.getState().addImages(files)

    const images = useImageStore.getState().images
    const ids = images.map((img) => img.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })
})
