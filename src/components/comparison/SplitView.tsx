import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { ImageFile, CompressedResult } from '@/types'

interface SplitViewProps {
  original: ImageFile
  compressed: CompressedResult | null
  onDividerMove?: (position: number) => void
}

/**
 * SplitView component renders original and compressed images side-by-side
 * with a draggable divider and synchronized zoom/pan
 * Requirements: 3.1, 3.2, 3.3
 */
export function SplitView({ original, compressed, onDividerMove }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dividerPosition, setDividerPosition] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const lastPanPosition = useRef({ x: 0, y: 0 })

  // Compressed image URL - use useMemo to derive from compressed prop
  const compressedUrl = useMemo(() => {
    if (compressed?.blob) {
      return URL.createObjectURL(compressed.blob)
    }
    return null
  }, [compressed])

  // Cleanup object URL on change or unmount
  useEffect(() => {
    return () => {
      if (compressedUrl) {
        URL.revokeObjectURL(compressedUrl)
      }
    }
  }, [compressedUrl])

  // Handle divider drag
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.max(10, Math.min(90, (x / rect.width) * 100))
      setDividerPosition(percentage)
      onDividerMove?.(percentage)
    }

    if (isPanning) {
      const deltaX = e.clientX - lastPanPosition.current.x
      const deltaY = e.clientY - lastPanPosition.current.y
      lastPanPosition.current = { x: e.clientX, y: e.clientY }
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
    }
  }, [isDragging, isPanning, onDividerMove])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsPanning(false)
  }, [])

  // Handle pan start
  const handleImageMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !isDragging) {
      e.preventDefault()
      setIsPanning(true)
      lastPanPosition.current = { x: e.clientX, y: e.clientY }
    }
  }, [isDragging])

  // Handle zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)))
  }, [])

  // Reset zoom and pan
  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging || isPanning) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isPanning, handleMouseMove, handleMouseUp])

  const imageStyle = {
    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
    transformOrigin: 'center center',
  }

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-[var(--muted-foreground)]">
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleReset}
            className="text-[var(--primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded"
            aria-label="Reset zoom and pan"
          >
            Reset
          </button>
        </div>
        <span className="text-[var(--muted-foreground)]">
          Drag divider to compare • Scroll to zoom • Drag to pan
        </span>
      </div>

      {/* Split View Container */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full aspect-video rounded-lg overflow-hidden',
          'border border-[var(--border)] bg-[var(--muted)]',
          (isDragging || isPanning) && 'cursor-grabbing',
          !isDragging && !isPanning && 'cursor-grab'
        )}
        onWheel={handleWheel}
        onMouseDown={handleImageMouseDown}
        role="img"
        aria-label="Image comparison view"
      >
        {/* Original Image (Full width, clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - dividerPosition}% 0 0)` }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={original.preview}
              alt="Original image"
              className="max-w-none select-none"
              style={imageStyle}
              draggable={false}
            />
          </div>
          {/* Original Label */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 text-white text-xs rounded">
            Original
          </div>
        </div>

        {/* Compressed Image (Full width, clipped from left) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${dividerPosition}%)` }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {compressedUrl ? (
              <img
                src={compressedUrl}
                alt="Compressed image"
                className="max-w-none select-none"
                style={imageStyle}
                draggable={false}
              />
            ) : (
              <div className="text-[var(--muted-foreground)] text-sm">
                No compressed image
              </div>
            )}
          </div>
          {/* Compressed Label */}
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded">
            Compressed
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          className={cn(
            'absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10',
            'hover:bg-[var(--primary)] transition-colors',
            'focus-visible:bg-[var(--primary)]',
            isDragging && 'bg-[var(--primary)]'
          )}
          style={{ left: `${dividerPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleDividerMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(dividerPosition)}
          aria-valuemin={10}
          aria-valuemax={90}
          aria-label={`Comparison divider at ${Math.round(dividerPosition)}%. Use arrow keys to adjust.`}
          aria-valuetext={`${Math.round(dividerPosition)}% showing original image`}
          tabIndex={0}
          onKeyDown={(e) => {
            let newPos = dividerPosition
            const step = e.shiftKey ? 10 : 5 // Larger steps with Shift key
            
            switch (e.key) {
              case 'ArrowLeft':
                e.preventDefault()
                newPos = Math.max(10, dividerPosition - step)
                break
              case 'ArrowRight':
                e.preventDefault()
                newPos = Math.min(90, dividerPosition + step)
                break
              case 'Home':
                e.preventDefault()
                newPos = 10
                break
              case 'End':
                e.preventDefault()
                newPos = 90
                break
              default:
                return
            }
            
            setDividerPosition(newPos)
            onDividerMove?.(newPos)
          }}
        >
          {/* Divider Handle */}
          <div
            className={cn(
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-8 h-8 rounded-full bg-white shadow-md',
              'flex items-center justify-center',
              'border-2 border-[var(--border)]',
              isDragging && 'border-[var(--primary)]'
            )}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-[var(--muted-foreground)] rounded-full" />
              <div className="w-0.5 h-3 bg-[var(--muted-foreground)] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
