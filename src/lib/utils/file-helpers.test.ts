import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { validateFile, generateCompressedFilename } from './file-helpers'
import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE } from '../../types'
import type { OutputFormat } from '../../types'

// Helper to create a mock File object
function createMockFile(size: number, type: string, name = 'test.jpg'): File {
  const blob = new Blob([new ArrayBuffer(size)], { type })
  return new File([blob], name, { type })
}

/**
 * Feature: compressorx, Property 1: File Validation Correctness
 * 
 * For any file, the validation function SHALL accept the file if and only if:
 * - The file size is less than or equal to 50MB, AND
 * - The file MIME type is one of the supported types
 * 
 * Validates: Requirements 1.3, 1.4
 */
describe('Feature: compressorx, Property 1: File Validation Correctness', () => {
  const validMimeTypes = [...SUPPORTED_MIME_TYPES]
  const invalidMimeTypes = [
    'text/plain',
    'application/pdf',
    'video/mp4',
    'audio/mpeg',
    'application/json',
    'text/html',
  ]

  it('accepts files with valid MIME types and size <= 50MB', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_FILE_SIZE }),
        fc.constantFrom(...validMimeTypes),
        (size, mimeType) => {
          const file = createMockFile(size, mimeType)
          const result = validateFile(file)
          return result.valid === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects files with invalid MIME types regardless of size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_FILE_SIZE }),
        fc.constantFrom(...invalidMimeTypes),
        (size, mimeType) => {
          const file = createMockFile(size, mimeType)
          const result = validateFile(file)
          return result.valid === false && result.error !== undefined
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects files exceeding 50MB regardless of MIME type', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 2 }),
        fc.constantFrom(...validMimeTypes),
        (size, mimeType) => {
          const file = createMockFile(size, mimeType)
          const result = validateFile(file)
          return result.valid === false && result.error !== undefined
        }
      ),
      { numRuns: 100 }
    )
  })

  it('correctly validates at the 50MB boundary', () => {
    // Exactly 50MB should be valid
    const exactlyMaxFile = createMockFile(MAX_FILE_SIZE, 'image/jpeg')
    expect(validateFile(exactlyMaxFile).valid).toBe(true)

    // One byte over should be invalid
    const overMaxFile = createMockFile(MAX_FILE_SIZE + 1, 'image/jpeg')
    expect(validateFile(overMaxFile).valid).toBe(false)
  })
})


/**
 * Feature: compressorx, Property 10: Filename Generation Pattern
 * 
 * For any original filename and output format, the generated filename SHALL:
 * - Start with the original filename without its extension
 * - End with `_compressed.{format}` where format is the output format extension
 * 
 * Validates: Requirements 5.2
 */
describe('Feature: compressorx, Property 10: Filename Generation Pattern', () => {
  const outputFormats: OutputFormat[] = ['jpeg', 'png', 'webp', 'avif']
  const formatExtensions: Record<OutputFormat, string> = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
    avif: 'avif',
  }

  it('generates filenames following the pattern {name}_compressed.{format}', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.') && s.trim().length > 0),
        fc.constantFrom(...['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']),
        fc.constantFrom(...outputFormats),
        (baseName, originalExt, format) => {
          const originalName = `${baseName}.${originalExt}`
          const result = generateCompressedFilename(originalName, format)
          const expectedExt = formatExtensions[format]
          
          // Should start with base name
          const startsCorrectly = result.startsWith(baseName)
          // Should end with _compressed.{ext}
          const endsCorrectly = result.endsWith(`_compressed.${expectedExt}`)
          // Should have the exact pattern
          const exactPattern = result === `${baseName}_compressed.${expectedExt}`
          
          return startsCorrectly && endsCorrectly && exactPattern
        }
      ),
      { numRuns: 100 }
    )
  })

  it('handles filenames without extensions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.') && s.trim().length > 0),
        fc.constantFrom(...outputFormats),
        (baseName, format) => {
          const result = generateCompressedFilename(baseName, format)
          const expectedExt = formatExtensions[format]
          return result === `${baseName}_compressed.${expectedExt}`
        }
      ),
      { numRuns: 100 }
    )
  })

  it('handles filenames with multiple dots', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('.') && s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('.') && s.trim().length > 0),
        fc.constantFrom(...['jpg', 'png', 'webp']),
        fc.constantFrom(...outputFormats),
        (part1, part2, originalExt, format) => {
          const originalName = `${part1}.${part2}.${originalExt}`
          const result = generateCompressedFilename(originalName, format)
          const expectedExt = formatExtensions[format]
          const expectedBase = `${part1}.${part2}`
          return result === `${expectedBase}_compressed.${expectedExt}`
        }
      ),
      { numRuns: 100 }
    )
  })
})


import { calculateDimensions } from './file-helpers'

/**
 * Feature: compressorx, Property 5: Aspect Ratio Preservation
 * 
 * For any original image dimensions (width, height) and any max dimension constraints,
 * when maintainAspectRatio is true, the calculated output dimensions SHALL satisfy:
 * - output_width / output_height ≈ original_width / original_height (within floating point tolerance)
 * - output_width ≤ maxWidth (if specified)
 * - output_height ≤ maxHeight (if specified)
 * 
 * Validates: Requirements 2.7
 */
describe('Feature: compressorx, Property 5: Aspect Ratio Preservation', () => {
  it('maintains aspect ratio within tolerance when constraints are applied', () => {
    fc.assert(
      fc.property(
        // Use minimum of 100 to ensure meaningful dimensions after scaling
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 100, max: 5000 }),
        (origWidth, origHeight, maxWidth, maxHeight) => {
          const result = calculateDimensions(
            { width: origWidth, height: origHeight },
            { maxWidth, maxHeight, maintainAspectRatio: true }
          )

          // Skip if result is zero (edge case)
          if (result.width === 0 || result.height === 0) {
            return true
          }

          const originalRatio = origWidth / origHeight
          const resultRatio = result.width / result.height
          
          // Calculate tolerance based on output dimensions
          // Rounding error is at most 0.5 per dimension, so max ratio error is:
          // |w/h - (w±0.5)/(h±0.5)| ≈ 0.5/min(w,h) + 0.5*w/h²
          // Simplified: tolerance scales inversely with smaller dimension
          const minDim = Math.min(result.width, result.height)
          const tolerance = Math.max(0.01, 1 / minDim + 0.5 / minDim)
          
          const ratioDiff = Math.abs(originalRatio - resultRatio) / originalRatio

          return ratioDiff < tolerance
        }
      ),
      { numRuns: 100 }
    )
  })

  it('output dimensions never exceed max constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 1, max: 5000 }),
        (origWidth, origHeight, maxWidth, maxHeight) => {
          const result = calculateDimensions(
            { width: origWidth, height: origHeight },
            { maxWidth, maxHeight, maintainAspectRatio: true }
          )

          return result.width <= maxWidth && result.height <= maxHeight
        }
      ),
      { numRuns: 100 }
    )
  })

  it('returns original dimensions when no constraints are specified', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        (origWidth, origHeight) => {
          const result = calculateDimensions(
            { width: origWidth, height: origHeight },
            { maintainAspectRatio: true }
          )

          return result.width === origWidth && result.height === origHeight
        }
      ),
      { numRuns: 100 }
    )
  })

  it('handles zero dimensions gracefully', () => {
    expect(calculateDimensions({ width: 0, height: 100 }, { maintainAspectRatio: true }))
      .toEqual({ width: 0, height: 0 })
    expect(calculateDimensions({ width: 100, height: 0 }, { maintainAspectRatio: true }))
      .toEqual({ width: 0, height: 0 })
  })
})


import { calculateCompressionRatio, getCompressionIndicator } from './file-helpers'

/**
 * Feature: compressorx, Property 7: Compression Ratio Classification
 * 
 * For any compression ratio value:
 * - If ratio > 60%, the indicator SHALL be 'green'
 * - If 30% ≤ ratio ≤ 60%, the indicator SHALL be 'yellow'
 * - If ratio < 30%, the indicator SHALL be 'orange'
 * 
 * The classification function SHALL be total (handle all valid ratio values) and deterministic.
 * 
 * Validates: Requirements 3.5, 3.6, 3.7
 */
describe('Feature: compressorx, Property 7: Compression Ratio Classification', () => {
  it('returns green for ratios greater than 60%', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 60.01, max: 100, noNaN: true }),
        (ratio) => {
          return getCompressionIndicator(ratio) === 'green'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('returns yellow for ratios between 30% and 60% (inclusive)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 30, max: 60, noNaN: true }),
        (ratio) => {
          return getCompressionIndicator(ratio) === 'yellow'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('returns orange for ratios less than 30%', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 29.99, noNaN: true }),
        (ratio) => {
          return getCompressionIndicator(ratio) === 'orange'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('classification is deterministic - same input always produces same output', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (ratio) => {
          const result1 = getCompressionIndicator(ratio)
          const result2 = getCompressionIndicator(ratio)
          return result1 === result2
        }
      ),
      { numRuns: 100 }
    )
  })

  it('boundary values: exactly 60% is yellow, exactly 30% is yellow', () => {
    expect(getCompressionIndicator(60)).toBe('yellow')
    expect(getCompressionIndicator(30)).toBe('yellow')
    expect(getCompressionIndicator(60.01)).toBe('green')
    expect(getCompressionIndicator(29.99)).toBe('orange')
  })

  it('calculateCompressionRatio produces valid percentages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }),
        fc.integer({ min: 0, max: 100000000 }),
        (originalSize, compressedSize) => {
          const ratio = calculateCompressionRatio(originalSize, compressedSize)
          return ratio >= 0 && ratio <= 100
        }
      ),
      { numRuns: 100 }
    )
  })

  it('calculateCompressionRatio is correct for known values', () => {
    // 50% reduction: 100 -> 50
    expect(calculateCompressionRatio(100, 50)).toBe(50)
    // 75% reduction: 100 -> 25
    expect(calculateCompressionRatio(100, 25)).toBe(75)
    // 0% reduction: same size
    expect(calculateCompressionRatio(100, 100)).toBe(0)
    // Handles zero original size
    expect(calculateCompressionRatio(0, 50)).toBe(0)
  })
})
