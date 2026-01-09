# CompressorX

A powerful, privacy-focused image compression web application that runs entirely in your browser. No uploads to servers - your images stay on your device.

**[Live Demo](https://compressorx-bqes54xpm-ashfaaq-kazis-projects-86ac304d.vercel.app)**

![CompressorX](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Privacy First** - All compression happens client-side. Your images never leave your device.
- **Batch Processing** - Compress multiple images simultaneously with concurrent Web Workers.
- **Multiple Formats** - Export to JPEG, PNG, WebP, or AVIF.
- **Quality Control** - Fine-tune compression with quality presets or custom settings.
- **Dimension Scaling** - Resize images with aspect ratio lock.
- **Before/After Comparison** - Interactive split-view to compare original vs compressed.
- **Compression Metrics** - See file size reduction, compression ratio, and dimensions.
- **ZIP Export** - Download all compressed images as a single ZIP file.
- **Dark/Light Theme** - Automatic system theme detection with manual override.
- **PWA Support** - Install as a desktop/mobile app, works offline.
- **Responsive Design** - Works on desktop, tablet, and mobile.

## Tech Stack

- **React 19** - UI framework with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool with HMR
- **Tailwind CSS 4** - Utility-first styling
- **Zustand** - Lightweight state management
- **Radix UI** - Accessible component primitives
- **Web Workers** - Non-blocking compression
- **IndexedDB** - Compression history storage
- **Vitest** - Unit testing with 85 tests

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/martiancoder12/compressorx.git
cd compressorx

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Generate coverage report |

## Architecture

```
src/
├── components/          # React components organized by feature
│   ├── comparison/      # Before/after image comparison
│   ├── controls/        # Quality, format, dimension controls
│   ├── download/        # Download and export functionality
│   ├── layout/          # Header, footer, theme toggle
│   ├── processing/      # Progress indicators
│   ├── ui/              # Reusable UI primitives
│   └── upload/          # Drag-and-drop upload
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and business logic
│   ├── compression/     # Image compression engine
│   ├── storage/         # IndexedDB and localStorage
│   └── utils/           # Helper functions
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
└── workers/             # Web Worker for compression
```

## Browser Support

CompressorX uses modern browser APIs including:
- OffscreenCanvas
- Web Workers
- IndexedDB
- Service Workers (PWA)

Supported browsers: Chrome 80+, Firefox 75+, Safari 14+, Edge 80+

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Author

Built by [Ashfaaq Kazi](https://github.com/martiancoder12)
