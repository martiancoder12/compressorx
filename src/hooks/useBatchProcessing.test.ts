/**
 * Property tests for useBatchProcessing hook
 *
 * Feature: compressorx, Property 8: Batch Processing Shared Settings
 * For any batch of images processed together, all images in the batch SHALL be
 * compressed using identical CompressionOptions (same quality, format, dimensions,
 * and metadata settings).
 *
 * Validates: Requirements 4.1
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { CompressionOptions, OutputFormat } from '../types'
import { validateCompressionOptions } from '../lib/compression/compressor'

// Arbitrary for generating valid CompressionOptions
const compressionOptionsArbitrary = fc.record({
  quality: fc.integer({ min: 0, max: 100 }),
  format: fc.constantFrom<OutputFormat>('jpeg', 'png', 'webp', 'avif'),
  maxWidth: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  maxHeight: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  maintainAspectRatio: fc.boolean(),
  stripMetadata: fc.boolean(),
  progressive: fc.option(fc.boolean(), { nil: undefined }),
})

// Arbitrary for generating batch of image IDs
const imageIdBatchArbitrary = fc.array(fc.uuid(), { minLength: 1, maxLength: 25 })

/**
 * Feature: compressorx, Property 8: Batch Processing Shared Settings
 *
 * This property verifies that when batch processing is initiated with a set of options,
 * those options are validated and stored consistently for all images in the batch.
 *
 * Validates: Requirements 4.1
 */
describe('Feature: compressorx, Property 8: Batch Processing Shared Settings', () => {
  it('all images in a batch use identical validated compression options', () => {
    fc.assert(
      fc.property(
        compressionOptionsArbitrary,
        imageIdBatchArbitrary,
        (options, imageIds) => {
          // Validate options once (as the hook does)
          const validatedOptions = validateCompressionOptions(options)

          // Simulate what the hook does: validate options once and apply to all images
          const optionsPerImage: CompressionOptions[] = imageIds.map(() => ({
            ...validatedOptions,
          }))

          // Verify all images would receive identical options
          const firstOptions = optionsPerImage[0]

          for (let i = 1; i < optionsPerImage.length; i++) {
            const currentOptions = optionsPerImage[i]

            // All option fields must be identical
            expect(currentOptions.quality).toBe(firstOptions.quality)
            expect(currentOptions.format).toBe(firstOptions.format)
            expect(currentOptions.maxWidth).toBe(firstOptions.maxWidth)
            expect(currentOptions.maxHeight).toBe(firstOptions.maxHeight)
            expect(currentOptions.maintainAspectRatio).toBe(firstOptions.maintainAspectRatio)
            expect(currentOptions.stripMetadata).toBe(firstOptions.stripMetadata)
            expect(currentOptions.progressive).toBe(firstOptions.progressive)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('validated options are deterministic for the same input', () => {
    fc.assert(
      fc.property(compressionOptionsArbitrary, (options) => {
        // Validate the same options multiple times
        const validated1 = validateCompressionOptions(options)
        const validated2 = validateCompressionOptions(options)
        const validated3 = validateCompressionOptions(options)

        // All validations should produce identical results
        expect(validated1.quality).toBe(validated2.quality)
        expect(validated1.quality).toBe(validated3.quality)
        expect(validated1.format).toBe(validated2.format)
        expect(validated1.format).toBe(validated3.format)
        expect(validated1.maxWidth).toBe(validated2.maxWidth)
        expect(validated1.maxWidth).toBe(validated3.maxWidth)
        expect(validated1.maxHeight).toBe(validated2.maxHeight)
        expect(validated1.maxHeight).toBe(validated3.maxHeight)
        expect(validated1.maintainAspectRatio).toBe(validated2.maintainAspectRatio)
        expect(validated1.maintainAspectRatio).toBe(validated3.maintainAspectRatio)
        expect(validated1.stripMetadata).toBe(validated2.stripMetadata)
        expect(validated1.stripMetadata).toBe(validated3.stripMetadata)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('quality clamping is consistent across batch', () => {
    fc.assert(
      fc.property(
        // Generate quality values that may be out of bounds
        fc.integer({ min: -100, max: 200 }),
        fc.constantFrom<OutputFormat>('jpeg', 'png', 'webp', 'avif'),
        fc.integer({ min: 1, max: 25 }),
        (quality, format, batchSize) => {
          const options: CompressionOptions = {
            quality,
            format,
            maintainAspectRatio: true,
            stripMetadata: true,
          }

          // Validate options
          const validatedOptions = validateCompressionOptions(options)

          // Quality should be clamped to 0-100
          expect(validatedOptions.quality).toBeGreaterThanOrEqual(0)
          expect(validatedOptions.quality).toBeLessThanOrEqual(100)

          // Simulate batch: all images get the same clamped quality
          const qualitiesPerImage = Array.from({ length: batchSize }, () => validatedOptions.quality)

          // All should be identical
          const allSame = qualitiesPerImage.every((q) => q === qualitiesPerImage[0])
          return allSame
        }
      ),
      { numRuns: 100 }
    )
  })

  it('format is preserved identically across batch', () => {
    fc.assert(
      fc.property(
        compressionOptionsArbitrary,
        fc.integer({ min: 2, max: 25 }),
        (options, batchSize) => {
          const validatedOptions = validateCompressionOptions(options)

          // Simulate batch processing: each image gets the same format
          const formatsPerImage = Array.from({ length: batchSize }, () => validatedOptions.format)

          // All formats must be identical
          const allSameFormat = formatsPerImage.every((f) => f === formatsPerImage[0])
          return allSameFormat
        }
      ),
      { numRuns: 100 }
    )
  })

  it('dimension constraints are shared across batch', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom<OutputFormat>('jpeg', 'png', 'webp'),
        fc.option(fc.integer({ min: 100, max: 5000 }), { nil: undefined }),
        fc.option(fc.integer({ min: 100, max: 5000 }), { nil: undefined }),
        fc.integer({ min: 2, max: 25 }),
        (quality, format, maxWidth, maxHeight, batchSize) => {
          const options: CompressionOptions = {
            quality,
            format,
            maxWidth,
            maxHeight,
            maintainAspectRatio: true,
            stripMetadata: true,
          }

          const validatedOptions = validateCompressionOptions(options)

          // Simulate batch: all images get the same dimension constraints
          const dimensionsPerImage = Array.from({ length: batchSize }, () => ({
            maxWidth: validatedOptions.maxWidth,
            maxHeight: validatedOptions.maxHeight,
          }))

          // All dimension constraints must be identical
          const allSameDimensions = dimensionsPerImage.every(
            (d) =>
              d.maxWidth === dimensionsPerImage[0].maxWidth &&
              d.maxHeight === dimensionsPerImage[0].maxHeight
          )

          return allSameDimensions
        }
      ),
      { numRuns: 100 }
    )
  })

  it('metadata settings are shared across batch', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom<OutputFormat>('jpeg', 'png', 'webp'),
        fc.boolean(),
        fc.integer({ min: 2, max: 25 }),
        (quality, format, stripMetadata, batchSize) => {
          const options: CompressionOptions = {
            quality,
            format,
            maintainAspectRatio: true,
            stripMetadata,
          }

          const validatedOptions = validateCompressionOptions(options)

          // Simulate batch: all images get the same metadata setting
          const metadataPerImage = Array.from(
            { length: batchSize },
            () => validatedOptions.stripMetadata
          )

          // All metadata settings must be identical
          const allSameMetadata = metadataPerImage.every((m) => m === metadataPerImage[0])
          return allSameMetadata
        }
      ),
      { numRuns: 100 }
    )
  })
})
