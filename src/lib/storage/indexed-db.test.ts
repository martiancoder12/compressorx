import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import 'fake-indexeddb/auto'
import {
  addHistoryEntry,
  getHistoryEntries,
  getHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  getHistoryCount,
  MAX_HISTORY_ENTRIES,
} from './indexed-db'
import type { CompressionHistoryEntry, OutputFormat } from '../../types'

// Helper to generate a valid history entry
function createHistoryEntry(overrides: Partial<CompressionHistoryEntry> = {}): CompressionHistoryEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    originalName: 'test-image.jpg',
    originalSize: 1024 * 1024,
    compressedSize: 512 * 1024,
    format: 'webp',
    quality: 70,
    ...overrides,
  }
}

// Arbitrary for generating valid history entries
const formatArbitrary = fc.constantFrom<OutputFormat>('jpeg', 'png', 'webp', 'avif')

const historyEntryArbitrary = fc.record({
  id: fc.uuid(),
  timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
  originalName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  originalSize: fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
  compressedSize: fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
  format: formatArbitrary,
  quality: fc.integer({ min: 0, max: 100 }),
})

// Clear IndexedDB before each test
beforeEach(async () => {
  await clearHistory()
})

afterEach(async () => {
  await clearHistory()
})

/**
 * Feature: compressorx, Property 12: History Entry Limit
 * 
 * For any sequence of compression operations, the history stored in IndexedDB
 * SHALL contain at most 100 entries. When a new entry is added and the limit
 * is reached, the oldest entry SHALL be removed.
 * 
 * Validates: Requirements 6.4
 */
describe('Feature: compressorx, Property 12: History Entry Limit', () => {
  it('history never exceeds MAX_HISTORY_ENTRIES limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 150 }),
        async (numEntries) => {
          await clearHistory()
          
          // Add entries
          for (let i = 0; i < numEntries; i++) {
            const entry = createHistoryEntry({
              id: `entry-${i}`,
              timestamp: i, // Use index as timestamp for ordering
            })
            await addHistoryEntry(entry)
          }
          
          // Check count never exceeds limit
          const count = await getHistoryCount()
          return count <= MAX_HISTORY_ENTRIES
        }
      ),
      { numRuns: 20 } // Reduced runs due to async nature
    )
  })

  it('FIFO eviction removes oldest entries when limit is reached', async () => {
    await clearHistory()
    
    // Fill to capacity
    for (let i = 0; i < MAX_HISTORY_ENTRIES; i++) {
      const entry = createHistoryEntry({
        id: `entry-${i}`,
        timestamp: i,
        originalName: `image-${i}.jpg`,
      })
      await addHistoryEntry(entry)
    }
    
    // Verify at capacity
    let count = await getHistoryCount()
    expect(count).toBe(MAX_HISTORY_ENTRIES)
    
    // Add one more entry
    const newEntry = createHistoryEntry({
      id: 'new-entry',
      timestamp: MAX_HISTORY_ENTRIES + 1,
      originalName: 'new-image.jpg',
    })
    await addHistoryEntry(newEntry)
    
    // Count should still be at limit
    count = await getHistoryCount()
    expect(count).toBe(MAX_HISTORY_ENTRIES)
    
    // Oldest entry (entry-0) should be gone
    const oldestEntry = await getHistoryEntry('entry-0')
    expect(oldestEntry).toBeNull()
    
    // New entry should exist
    const addedEntry = await getHistoryEntry('new-entry')
    expect(addedEntry).not.toBeNull()
    expect(addedEntry?.originalName).toBe('new-image.jpg')
  })

  it('adding multiple entries beyond limit evicts correct number of old entries', async () => {
    await clearHistory()
    
    // Fill to capacity
    for (let i = 0; i < MAX_HISTORY_ENTRIES; i++) {
      const entry = createHistoryEntry({
        id: `entry-${i}`,
        timestamp: i,
      })
      await addHistoryEntry(entry)
    }
    
    // Add 10 more entries
    const additionalEntries = 10
    for (let i = 0; i < additionalEntries; i++) {
      const entry = createHistoryEntry({
        id: `new-entry-${i}`,
        timestamp: MAX_HISTORY_ENTRIES + i,
      })
      await addHistoryEntry(entry)
    }
    
    // Count should still be at limit
    const count = await getHistoryCount()
    expect(count).toBe(MAX_HISTORY_ENTRIES)
    
    // First 10 entries should be gone
    for (let i = 0; i < additionalEntries; i++) {
      const entry = await getHistoryEntry(`entry-${i}`)
      expect(entry).toBeNull()
    }
    
    // Entry at index 10 should still exist
    const survivingEntry = await getHistoryEntry(`entry-${additionalEntries}`)
    expect(survivingEntry).not.toBeNull()
  })

  it('entries are returned in newest-first order', async () => {
    await clearHistory()
    
    // Add entries with known timestamps
    const entries = [
      createHistoryEntry({ id: 'oldest', timestamp: 1000 }),
      createHistoryEntry({ id: 'middle', timestamp: 2000 }),
      createHistoryEntry({ id: 'newest', timestamp: 3000 }),
    ]
    
    for (const entry of entries) {
      await addHistoryEntry(entry)
    }
    
    const retrieved = await getHistoryEntries()
    
    expect(retrieved.length).toBe(3)
    expect(retrieved[0].id).toBe('newest')
    expect(retrieved[1].id).toBe('middle')
    expect(retrieved[2].id).toBe('oldest')
  })
})

describe('IndexedDB history CRUD operations', () => {
  it('can add and retrieve a single entry', async () => {
    const entry = createHistoryEntry()
    
    const addResult = await addHistoryEntry(entry)
    expect(addResult).toBe(true)
    
    const retrieved = await getHistoryEntry(entry.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.id).toBe(entry.id)
    expect(retrieved?.originalName).toBe(entry.originalName)
    expect(retrieved?.format).toBe(entry.format)
  })

  it('can delete an entry', async () => {
    const entry = createHistoryEntry()
    
    await addHistoryEntry(entry)
    
    const deleteResult = await deleteHistoryEntry(entry.id)
    expect(deleteResult).toBe(true)
    
    const retrieved = await getHistoryEntry(entry.id)
    expect(retrieved).toBeNull()
  })

  it('can clear all entries', async () => {
    // Add multiple entries
    for (let i = 0; i < 5; i++) {
      await addHistoryEntry(createHistoryEntry({ id: `entry-${i}` }))
    }
    
    let count = await getHistoryCount()
    expect(count).toBe(5)
    
    await clearHistory()
    
    count = await getHistoryCount()
    expect(count).toBe(0)
  })

  it('returns null for non-existent entry', async () => {
    const entry = await getHistoryEntry('non-existent-id')
    expect(entry).toBeNull()
  })

  it('returns empty array when no entries exist', async () => {
    const entries = await getHistoryEntries()
    expect(entries).toEqual([])
  })

  it('preserves all entry fields through round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        historyEntryArbitrary,
        async (entry) => {
          await clearHistory()
          
          await addHistoryEntry(entry)
          const retrieved = await getHistoryEntry(entry.id)
          
          if (!retrieved) return false
          
          return (
            retrieved.id === entry.id &&
            retrieved.timestamp === entry.timestamp &&
            retrieved.originalName === entry.originalName &&
            retrieved.originalSize === entry.originalSize &&
            retrieved.compressedSize === entry.compressedSize &&
            retrieved.format === entry.format &&
            retrieved.quality === entry.quality
          )
        }
      ),
      { numRuns: 50 }
    )
  })
})
