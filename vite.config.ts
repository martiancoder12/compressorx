import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'CompressorX',
        short_name: 'CompressorX',
        description: 'Client-side image compression web application',
        theme_color: '#f5f0e8',
        background_color: '#f5f0e8',
        display: 'standalone',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache images created during compression (blob URLs won't be cached, but this handles any static images)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ],
        // Don't precache source maps
        globIgnores: ['**/*.map']
      },
      devOptions: {
        enabled: false // Disable in dev mode to avoid issues
      }
    }),
    // Bundle analyzer - generates stats.html after build
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Code-splitting configuration using function-based manualChunks
    rollupOptions: {
      output: {
        // Manual chunks for better code-splitting
        manualChunks(id: string) {
          // React core
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          // Radix UI components
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui'
          }
          // Utility libraries
          if (id.includes('node_modules/clsx') || 
              id.includes('node_modules/tailwind-merge') || 
              id.includes('node_modules/class-variance-authority')) {
            return 'vendor-utils'
          }
          // State management
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state'
          }
          // ZIP generation (larger dependency)
          if (id.includes('node_modules/jszip')) {
            return 'vendor-zip'
          }
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          // React dropzone
          if (id.includes('node_modules/react-dropzone')) {
            return 'vendor-dropzone'
          }
        }
      }
    },
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Minification settings
    minify: 'esbuild',
    // Source maps for production debugging (optional)
    sourcemap: false,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500
  }
})
