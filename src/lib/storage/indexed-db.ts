import type { CompressionHistoryEntry } from '../../types'

/**
 * IndexedDB database name and version
 */
const DB_NAME = 'compressorx-db'
const DB_VERSION = 1
const STORE_NAME = 'compression-history'

/**
 * Maximum number of history entries to keep
 */
export const MAX_HISTORY_ENTRIES = 100

/**
 * Opens the IndexedDB database, creating it if necessary
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Create the history store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        // Create index on timestamp for ordering and FIFO eviction
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Adds a history entry to IndexedDB
 * Enforces the 100-entry limit with FIFO eviction
 */
export async function addHistoryEntry(entry: CompressionHistoryEntry): Promise<boolean> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      // First, count existing entries
      const countRequest = store.count()
      
      countRequest.onsuccess = () => {
        const count = countRequest.result
        
        // If at or over limit, delete oldest entries
        if (count >= MAX_HISTORY_ENTRIES) {
          const entriesToDelete = count - MAX_HISTORY_ENTRIES + 1
          const index = store.index('timestamp')
          const cursorRequest = index.openCursor()
          let deleted = 0
          
          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
            if (cursor && deleted < entriesToDelete) {
              store.delete(cursor.primaryKey)
              deleted++
              cursor.continue()
            } else {
              // After deletion, add the new entry
              const addRequest = store.add(entry)
              addRequest.onsuccess = () => resolve(true)
              addRequest.onerror = () => reject(new Error('Failed to add history entry'))
            }
          }
          
          cursorRequest.onerror = () => reject(new Error('Failed to evict old entries'))
        } else {
          // Under limit, just add the entry
          const addRequest = store.add(entry)
          addRequest.onsuccess = () => resolve(true)
          addRequest.onerror = () => reject(new Error('Failed to add history entry'))
        }
      }
      
      countRequest.onerror = () => reject(new Error('Failed to count entries'))
      
      transaction.oncomplete = () => db.close()
      transaction.onerror = () => {
        db.close()
        reject(new Error('Transaction failed'))
      }
    })
  } catch (error) {
    console.error('Failed to add history entry:', error)
    return false
  }
}

/**
 * Gets all history entries, sorted by timestamp (newest first)
 */
export async function getHistoryEntries(): Promise<CompressionHistoryEntry[]> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('timestamp')
      
      // Get all entries sorted by timestamp descending (newest first)
      const request = index.openCursor(null, 'prev')
      const entries: CompressionHistoryEntry[] = []
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          entries.push(cursor.value as CompressionHistoryEntry)
          cursor.continue()
        } else {
          resolve(entries)
        }
      }
      
      request.onerror = () => reject(new Error('Failed to get history entries'))
      
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to get history entries:', error)
    return []
  }
}

/**
 * Gets a single history entry by ID
 */
export async function getHistoryEntry(id: string): Promise<CompressionHistoryEntry | null> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)
      
      request.onsuccess = () => {
        // IndexedDB returns undefined for non-existent keys, normalize to null
        resolve(request.result ?? null)
      }
      
      request.onerror = () => reject(new Error('Failed to get history entry'))
      
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to get history entry:', error)
    return null
  }
}

/**
 * Deletes a history entry by ID
 */
export async function deleteHistoryEntry(id: string): Promise<boolean> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(new Error('Failed to delete history entry'))
      
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to delete history entry:', error)
    return false
  }
}

/**
 * Clears all history entries
 */
export async function clearHistory(): Promise<boolean> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(new Error('Failed to clear history'))
      
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to clear history:', error)
    return false
  }
}

/**
 * Gets the count of history entries
 */
export async function getHistoryCount(): Promise<number> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('Failed to count history entries'))
      
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Failed to count history entries:', error)
    return 0
  }
}

/**
 * Checks if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}
