/**
 * CompressorX Main Application
 * Client-side image compression web application
 * 
 * Requirements: 9.1, 9.2, 9.3, 10.3
 */

import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react'
import { Header, Footer } from './components/layout'
import { DropZone, ImagePreviewGrid } from './components/upload'
import {
  QualitySlider,
  PresetButtons,
  FormatSelector,
  DimensionControls,
  AdvancedOptions,
} from './components/controls'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { useImageStore, useSettingsStore } from './stores'
import { useBatchProcessing } from './hooks/useBatchProcessing'
import type { CompressionOptions, OutputFormat } from './types'

// Lazy load non-critical components for better initial bundle size
// These components are only needed after images are uploaded and processed
const SplitView = lazy(() => import('./components/comparison/SplitView').then(m => ({ default: m.SplitView })))
const MetricsPanel = lazy(() => import('./components/comparison/MetricsPanel').then(m => ({ default: m.MetricsPanel })))
const BatchStatus = lazy(() => import('./components/processing/BatchStatus').then(m => ({ default: m.BatchStatus })))
const DownloadButton = lazy(() => import('./components/download/DownloadButton').then(m => ({ default: m.DownloadButton })))
const BatchExport = lazy(() => import('./components/download/BatchExport').then(m => ({ default: m.BatchExport })))

/**
 * Loading fallback component for lazy-loaded sections
 */
function LoadingFallback({ height = 'h-32' }: { height?: string }) {
  return (
    <div 
      className={`${height} flex items-center justify-center bg-[var(--muted)]/20 rounded-lg animate-pulse`}
      role="status"
      aria-label="Loading content"
    >
      <span className="text-[var(--muted-foreground)] text-sm">Loading...</span>
    </div>
  )
}

/**
 * Error Boundary for graceful degradation
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div 
            className="p-6 rounded-lg border border-[var(--destructive)] bg-[var(--destructive)]/10"
            role="alert"
            aria-live="assertive"
          >
            <h3 className="text-lg font-semibold text-[var(--destructive)] mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null })}
              aria-label="Try again after error"
            >
              Try Again
            </Button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

/**
 * Main App Component
 */
function App() {
  // Image store
  const images = useImageStore((state) => state.images)
  
  // Settings store
  const {
    defaultQuality,
    defaultFormat,
    stripMetadata,
    advancedOptionsExpanded,
    setDefaultQuality,
    setDefaultFormat,
    setStripMetadata,
    setAdvancedOptionsExpanded,
  } = useSettingsStore()

  // Local state for compression options
  const [quality, setQuality] = useState(defaultQuality)
  const [format, setFormat] = useState<OutputFormat>(defaultFormat)
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [progressive, setProgressive] = useState(false)

  // Selected image for comparison view
  const [selectedImageId] = useState<string | null>(null)

  // Batch processing hook
  const {
    processBatch,
    cancel: cancelBatch,
    isProcessing,
    overallProgress,
    individualProgress,
    completedCount,
    totalCount,
  } = useBatchProcessing()

  // Get selected image
  const selectedImage = useMemo(() => {
    if (!selectedImageId) return null
    return images.find((img) => img.id === selectedImageId) || null
  }, [images, selectedImageId])

  // Get first completed image for comparison if none selected
  const displayImage = useMemo(() => {
    if (selectedImage) return selectedImage
    return images.find((img) => img.status === 'complete') || images[0] || null
  }, [selectedImage, images])

  // Build compression options
  const compressionOptions: CompressionOptions = useMemo(
    () => ({
      quality,
      format,
      maxWidth,
      maxHeight,
      maintainAspectRatio,
      stripMetadata,
      progressive: format === 'jpeg' ? progressive : undefined,
    }),
    [quality, format, maxWidth, maxHeight, maintainAspectRatio, stripMetadata, progressive]
  )

  // Handle quality change
  const handleQualityChange = useCallback((value: number) => {
    setQuality(value)
    setDefaultQuality(value)
  }, [setDefaultQuality])

  // Handle format change
  const handleFormatChange = useCallback((value: OutputFormat) => {
    setFormat(value)
    setDefaultFormat(value)
  }, [setDefaultFormat])

  // Handle metadata toggle
  const handleStripMetadataChange = useCallback((value: boolean) => {
    setStripMetadata(value)
  }, [setStripMetadata])

  // Handle compress all
  const handleCompressAll = useCallback(() => {
    const pendingImages = images.filter((img) => img.status === 'pending')
    if (pendingImages.length > 0) {
      processBatch(
        pendingImages.map((img) => img.id),
        compressionOptions
      )
    }
  }, [images, processBatch, compressionOptions])

  // Count pending images
  const pendingCount = images.filter((img) => img.status === 'pending').length
  const completedImagesCount = images.filter((img) => img.status === 'complete').length

  // Get original dimensions for dimension controls
  const originalDimensions = useMemo(() => {
    if (!displayImage) return undefined
    // We'd need to load the image to get dimensions, for now return undefined
    return undefined
  }, [displayImage])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-[var(--primary-foreground)] focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <ErrorBoundary>
        <Header />
      </ErrorBoundary>

      <main 
        id="main-content" 
        className="flex-1 container mx-auto max-w-5xl px-4 py-8"
        role="main"
        aria-label="Image compression application"
      >
        <div className="space-y-8">
          {/* Hero Section */}
          <section aria-labelledby="hero-heading" className="text-center space-y-4">
            <h1 id="hero-heading" className="text-heading-1 text-[var(--foreground)]">
              Compress Images Instantly
            </h1>
            <p className="text-body-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Fast, private, and free. All processing happens in your browser — your images never leave your device.
            </p>
          </section>

          {/* Upload Section */}
          <ErrorBoundary>
            <section aria-labelledby="upload-heading">
              <h2 id="upload-heading" className="sr-only">Upload images</h2>
              <DropZone disabled={isProcessing} />
            </section>
          </ErrorBoundary>

          {/* Image Preview Grid */}
          {images.length > 0 && (
            <ErrorBoundary>
              <section aria-labelledby="preview-heading">
                <h2 id="preview-heading" className="sr-only">Uploaded images preview</h2>
                <ImagePreviewGrid />
              </section>
            </ErrorBoundary>
          )}

          {/* Main Content Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls Panel */}
              <ErrorBoundary>
                <aside 
                  className="lg:col-span-1 space-y-4"
                  aria-labelledby="settings-heading"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle id="settings-heading" as="h2">Compression Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quality Presets */}
                      <PresetButtons
                        currentQuality={quality}
                        onPresetSelect={handleQualityChange}
                      />

                      {/* Quality Slider */}
                      <QualitySlider
                        value={quality}
                        onChange={handleQualityChange}
                        showEstimate={!!displayImage}
                        estimatedOriginalSize={displayImage?.file.size}
                      />

                      {/* Format Selector */}
                      <FormatSelector
                        value={format}
                        onChange={handleFormatChange}
                      />

                      {/* Dimension Controls */}
                      <DimensionControls
                        maxWidth={maxWidth}
                        maxHeight={maxHeight}
                        maintainAspectRatio={maintainAspectRatio}
                        onMaxWidthChange={setMaxWidth}
                        onMaxHeightChange={setMaxHeight}
                        onAspectRatioChange={setMaintainAspectRatio}
                        originalWidth={originalDimensions}
                        originalHeight={originalDimensions}
                      />

                      {/* Advanced Options */}
                      <AdvancedOptions
                        expanded={advancedOptionsExpanded}
                        onExpandedChange={setAdvancedOptionsExpanded}
                        stripMetadata={stripMetadata}
                        onStripMetadataChange={handleStripMetadataChange}
                        progressive={progressive}
                        onProgressiveChange={setProgressive}
                        currentFormat={format}
                      />

                      {/* Compress Button */}
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleCompressAll}
                        disabled={isProcessing || pendingCount === 0}
                        aria-label={isProcessing 
                          ? 'Processing images, please wait' 
                          : `Compress ${pendingCount} image${pendingCount !== 1 ? 's' : ''}`}
                        aria-busy={isProcessing}
                      >
                        {isProcessing
                          ? 'Processing...'
                          : `Compress ${pendingCount} Image${pendingCount !== 1 ? 's' : ''}`}
                      </Button>
                    </CardContent>
                  </Card>
                </aside>
              </ErrorBoundary>

              {/* Preview and Results Panel */}
              <ErrorBoundary>
                <section 
                  className="lg:col-span-2 space-y-4"
                  aria-labelledby="results-heading"
                >
                  <h2 id="results-heading" className="sr-only">Compression results and preview</h2>
                  
                  {/* Batch Status - Lazy loaded */}
                  {(isProcessing || totalCount > 0) && (
                    <Suspense fallback={<LoadingFallback height="h-24" />}>
                      <BatchStatus
                        isProcessing={isProcessing}
                        overallProgress={overallProgress}
                        individualProgress={individualProgress}
                        completedCount={completedCount}
                        totalCount={totalCount}
                        onCancel={cancelBatch}
                      />
                    </Suspense>
                  )}

                  {/* Comparison View - Lazy loaded */}
                  {displayImage && (
                    <Card>
                      <CardHeader>
                        <CardTitle as="h3">Preview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Suspense fallback={<LoadingFallback height="h-64" />}>
                          <SplitView
                            original={displayImage}
                            compressed={displayImage.compressed}
                          />
                        </Suspense>

                        {/* Metrics Panel - Lazy loaded */}
                        {displayImage.compressed && (
                          <Suspense fallback={<LoadingFallback height="h-20" />}>
                            <MetricsPanel
                              original={{
                                size: displayImage.file.size,
                                width: displayImage.compressed.width,
                                height: displayImage.compressed.height,
                              }}
                              compressed={{
                                size: displayImage.compressed.compressedSize,
                                width: displayImage.compressed.width,
                                height: displayImage.compressed.height,
                                format: displayImage.compressed.format,
                                compressionRatio: displayImage.compressed.compressionRatio,
                              }}
                            />
                          </Suspense>
                        )}

                        {/* Download Button - Lazy loaded */}
                        {displayImage.compressed && (
                          <Suspense fallback={<LoadingFallback height="h-10" />}>
                            <DownloadButton
                              blob={displayImage.compressed.blob}
                              originalFilename={displayImage.file.name}
                              format={displayImage.compressed.format}
                              className="w-full"
                            />
                          </Suspense>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Batch Export - Lazy loaded */}
                  {completedImagesCount >= 2 && (
                    <Card>
                      <CardHeader>
                        <CardTitle as="h3">Batch Export</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Suspense fallback={<LoadingFallback height="h-16" />}>
                          <BatchExport images={images} />
                        </Suspense>
                      </CardContent>
                    </Card>
                  )}
                </section>
              </ErrorBoundary>
            </div>
          )}

          {/* Empty State */}
          {images.length === 0 && (
            <section aria-label="Getting started" className="text-center py-12">
              <p className="text-[var(--muted-foreground)]">
                Drop some images above to get started
              </p>
            </section>
          )}
        </div>
      </main>

      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
    </div>
  )
}

export default App
