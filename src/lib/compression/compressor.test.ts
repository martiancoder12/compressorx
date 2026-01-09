/**
 * Tests for compression library wrapper
 * Feature: compressorx, Property 6: Compression Metrics Completeness
 * Validates: Requirements 3.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  clampQuality,
  isValidQuality,
  validateCompressionOptions,
  isValidCompressedResult,
  createCompressedResult,
} from './compressor'
import type { CompressionOptions, OutputFormat } from '../../types'

// Arbitrary for valid output formats
const outputFormatArb = fc.constantFrom<OutputFormat>('jpeg', 'png', 'webp', 'avif')

// Arbitrary for valid compression options
const compressionOptionsArb = fc.record({
  quality: fc.integer({ min: -100, max: 200 }), // Include invalid values to test clamping
  format: outputFormatArb,
  maxWidth: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  maxHeight: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  maintainAspectRatio: fc.boolean(),
  stripMetadata: fc.boolean(),
  progressive: fc.option(fc.boolean(), { nil: undefined }),
})

describe('Feature: compressorx, Property 6: Compression Metrics Completeness', () => {
  /**
   * Property 6: Compression Metrics Completeness
   * For any successful compression operation, the result SHALL contain all required metrics:
   * - originalSize (number > 0)
   * - compressedSize (number > 0)
   * - compressionRatio (calculated as percentage saved)
   * - width (number > 0)
   * - height (number > 0)
   * - format (valid OutputFormat)
   * 
   * Validates: Requirements 3.4
   */
  it('createCompressedResult produces valid results with all required fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }), // originalSize
        fc.integer({ min: 1, max: 100000000 }), // compressedSize (blob size)
        fc.integer({ min: 1, max: 10000 }), // width
        fc.integer({ min: 1, max: 10000 }), // height
        outputFormatArb,
        (originalSize, compressedSize, width, height, format) => {
          // Create a mock blob with the specified size
          const blob = new Blob([new ArrayBuffer(compressedSize)])

          const result = createCompressedResult(blob, originalSize, width, height, format)

          // Verify all required fields are present and valid
          expect(result.blob).toBeInstanceOf(Blob)
          expect(result.originalSize).toBe(originalSize)
          expect(result.originalSize).toBeGreaterThan(0)
          expect(result.compressedSize).toBeGreaterThan(0)
          expect(result.width).toBe(width)
          expect(result.width).toBeGreaterThan(0)
          expect(result.height).toBe(height)
          expect(result.height).toBeGreaterThan(0)
          expect(['jpeg', 'png', 'webp', 'avif']).toContain(result.format)
          expect(typeof result.compressionRatio).toBe('number')

          // Verify the result passes validation
          expect(isValidCompressedResult(result)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('isValidCompressedResult correctly validates result objects', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }),
        fc.integer({ min: 1, max: 100000000 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        outputFormatArb,
        (originalSize, compressedSize, width, height, format) => {
          const blob = new Blob([new ArrayBuffer(compressedSize)])
          const result = createCompressedResult(blob, originalSize, width, height, format)

          // Valid result should pass validation
          expect(isValidCompressedResult(result)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('isValidCompressedResult rejects invalid objects', () => {
    // Test various invalid inputs
    expect(isValidCompressedResult(null)).toBe(false)
    expect(isValidCompressedResult(undefined)).toBe(false)
    expect(isValidCompressedResult({})).toBe(false)
    expect(isValidCompressedResult({ blob: 'not a blob' })).toBe(false)
    expect(isValidCompressedResult({
      blob: new Blob(),
      originalSize: 0, // Invalid: must be > 0
      compressedSize: 100,
      width: 100,
      height: 100,
      format: 'jpeg',
      compressionRatio: 50,
    })).toBe(false)
    expect(isValidCompressedResult({
      blob: new Blob(),
      originalSize: 100,
      compressedSize: 0, // Invalid: must be > 0
      width: 100,
      height: 100,
      format: 'jpeg',
      compressionRatio: 50,
    })).toBe(false)
    expect(isValidCompressedResult({
      blob: new Blob(),
      originalSize: 100,
      compressedSize: 100,
      width: 0, // Invalid: must be > 0
      height: 100,
      format: 'jpeg',
      compressionRatio: 50,
    })).toBe(false)
    expect(isValidCompressedResult({
      blob: new Blob(),
      originalSize: 100,
      compressedSize: 100,
      width: 100,
      height: 0, // Invalid: must be > 0
      format: 'jpeg',
      compressionRatio: 50,
    })).toBe(false)
    expect(isValidCompressedResult({
      blob: new Blob(),
      originalSize: 100,
      compressedSize: 100,
      width: 100,
      height: 100,
      format: 'invalid', // Invalid format
      compressionRatio: 50,
    })).toBe(false)
  })

  it('compression ratio is calculated correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }),
        fc.integer({ min: 1, max: 100000000 }),
        (originalSize, compressedSize) => {
          const blob = new Blob([new ArrayBuffer(compressedSize)])
          const result = createCompressedResult(blob, originalSize, 100, 100, 'jpeg')

          // Calculate expected ratio
          const expectedRatio = ((originalSize - compressedSize) / originalSize) * 100
          const clampedExpected = Math.max(0, Math.min(100, expectedRatio))

          expect(result.compressionRatio).toBeCloseTo(clampedExpected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('clampQuality', () => {
  it('clamps values to 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        (quality) => {
          const clamped = clampQuality(quality)
          expect(clamped).toBeGreaterThanOrEqual(0)
          expect(clamped).toBeLessThanOrEqual(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('preserves valid values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (quality) => {
          expect(clampQuality(quality)).toBe(quality)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('handles NaN and invalid types', () => {
    expect(clampQuality(NaN)).toBe(70) // Default
    expect(clampQuality(Infinity)).toBe(100)
    expect(clampQuality(-Infinity)).toBe(0)
  })
})

describe('validateCompressionOptions', () => {
  it('validates and clamps quality in options', () => {
    fc.assert(
      fc.property(
        compressionOptionsArb,
        (options) => {
          const validated = validateCompressionOptions(options as CompressionOptions)

          // Quality should be clamped
          expect(validated.quality).toBeGreaterThanOrEqual(0)
          expect(validated.quality).toBeLessThanOrEqual(100)

          // Other fields should be preserved
          expect(validated.format).toBe(options.format)
          expect(validated.maintainAspectRatio).toBe(options.maintainAspectRatio)
          expect(validated.stripMetadata).toBe(options.stripMetadata)
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('Feature: compressorx, Property 4: Quality Value Bounds', () => {
  /**
   * Property 4: Quality Value Bounds
   * For any quality value, the compression options SHALL only accept values where 0 ≤ quality ≤ 100.
   * Values outside this range SHALL be rejected or clamped to the valid range.
   * 
   * Validates: Requirements 2.1
   */
  it('isValidQuality accepts values in 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (quality) => {
          expect(isValidQuality(quality)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('isValidQuality rejects values outside 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -1000, max: -1 }),
          fc.integer({ min: 101, max: 1000 })
        ),
        (quality) => {
          expect(isValidQuality(quality)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('clampQuality always returns values in 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -10000, max: 10000 }),
          fc.double({ min: -10000, max: 10000, noNaN: true })
        ),
        (quality) => {
          const clamped = clampQuality(quality)
          expect(clamped).toBeGreaterThanOrEqual(0)
          expect(clamped).toBeLessThanOrEqual(100)
          expect(Number.isInteger(clamped)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('clampQuality preserves valid integer values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (quality) => {
          expect(clampQuality(quality)).toBe(quality)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('clampQuality clamps values below 0 to 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: -1 }),
        (quality) => {
          expect(clampQuality(quality)).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('clampQuality clamps values above 100 to 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 101, max: 10000 }),
        (quality) => {
          expect(clampQuality(quality)).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('validateCompressionOptions ensures quality is always valid', () => {
    fc.assert(
      fc.property(
        compressionOptionsArb,
        (options) => {
          const validated = validateCompressionOptions(options as CompressionOptions)
          expect(isValidQuality(validated.quality)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
