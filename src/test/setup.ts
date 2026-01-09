import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock URL.createObjectURL for image preview tests
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: () => 'blob:mock-url',
})

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: () => {},
})
