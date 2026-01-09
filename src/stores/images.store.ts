import { create } from 'zustand'
import type { ImageFile, CompressedResult } from '../types'

/**
 * Image store state interface
 */
export interface ImageStoreState {
  images: ImageFile[]
  addImages: (files: File[]) => void
  removeImage: (id: string) => void
  clearAll: () => void
  updateStatus: (id: string, status: ImageFile['status']) => void
  updateCompressed: (id: string, result: CompressedResult) => void
  setError: (id: string, error: string) => void
}

/**
 * Generate a UUID for image tracking
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Create an ImageFile from a File object
 */
function createImageFile(file: File): ImageFile {
  return {
    id: generateId(),
    file,
    preview: URL.createObjectURL(file),
    status: 'pending',
    compressed: null,
  }
}

/**
 * Images store for managing uploaded images and their compression state
 */
export const useImageStore = create<ImageStoreState>((set) => ({
  images: [],

  addImages: (files: File[]) => {
    const newImages = files.map(createImageFile)
    set((state) => ({
      images: [...state.images, ...newImages],
    }))
  },

  removeImage: (id: string) => {
    set((state) => {
      const imageToRemove = state.images.find((img) => img.id === id)
      if (imageToRemove) {
        // Revoke the object URL to prevent memory leaks
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return {
        images: state.images.filter((img) => img.id !== id),
      }
    })
  },

  clearAll: () => {
    set((state) => {
      // Revoke all object URLs to prevent memory leaks
      state.images.forEach((img) => URL.revokeObjectURL(img.preview))
      return { images: [] }
    })
  },

  updateStatus: (id: string, status: ImageFile['status']) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, status } : img
      ),
    }))
  },

  updateCompressed: (id: string, result: CompressedResult) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id
          ? { ...img, compressed: result, status: 'complete' as const }
          : img
      ),
    }))
  },

  setError: (id: string, error: string) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id
          ? { ...img, error, status: 'error' as const }
          : img
      ),
    }))
  },
}))
