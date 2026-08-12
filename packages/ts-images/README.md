# ts-images

A powerful image optimization and manipulation toolkit for modern web development. This is the core library package of the imgx project.

## Installation

```bash
bun add ts-images -d
# or
npm install ts-images --save-dev
```

## Usage

### Library

```typescript
import { optimizeImage, processImage } from 'ts-images'

// Optimize a single image
await optimizeImage('input.jpg', {
  quality: 80,
  format: 'webp',
  output: 'output.webp',
})

// Process with advanced options
await processImage('photo.png', {
  resize: { width: 800, height: 600 },
  format: 'avif',
  quality: 75,
})
```

### Activity share cards

Create branded, browser-safe SVG cards for activity feeds, downloads, and native social sharing. The card includes a normalized route trace and the activity's key metrics without embedding source coordinates in the output.

```typescript
import { activityShareCardSvg } from 'ts-images/activity-card'

const svg = activityShareCardSvg({
  activityType: 'Trail run',
  athlete: 'Chris',
  completedAt: 'August 12, 2026',
  distance: '8.42 mi',
  duration: '1:07:32',
  elevation: '1,284 ft',
  pace: '8:01 /mi',
  preset: 'story',
  route: recordedPoints,
  title: 'Headlands sunrise',
})
```

Use `square` for feed posts, `story` for vertical stories, and `landscape` for link previews. `activityShareCardFileName()` creates a safe download name for the selected preset.

### CLI

```bash
# Optimize an image
imgx optimize input.jpg --quality 80 --format webp

# Batch process images
imgx batch ./images --format webp --quality 80

# Generate app icons
imgx app-icon logo.png --output ./icons

# Generate favicons
imgx favicon logo.svg --output ./public

# Optimize SVGs
imgx svg-optimize ./svgs
```

## Features

- **Format Conversion** - Convert between JPEG, PNG, WebP, AVIF, GIF, BMP
- **Image Optimization** - Lossy and lossless compression with smart quality settings
- **Batch Processing** - Process multiple images with configurable pipelines
- **App Icon Generation** - Generate iOS, macOS, and Android app icons from a single source
- **Favicon Generation** - Generate all required favicon sizes and formats
- **SVG Optimization** - Minify and optimize SVG files via SVGO
- **Image Placeholders** - Generate ThumbHash and BlurHash placeholders
- **Responsive Images** - Generate multiple sizes for responsive web design
- **Watermarking** - Add text or image watermarks
- **Image to SVG** - Convert raster images to SVG using potrace
- **Activity Share Cards** - Render route-aware square, story, and landscape social assets

## Supported Formats

| Format | Decode | Encode |
|--------|--------|--------|
| JPEG | Yes | Yes |
| PNG | Yes | Yes |
| WebP | Yes | Yes |
| AVIF | Yes | Yes |
| GIF | Yes | Yes |
| BMP | Yes | Yes |
| SVG | Yes | - |

## License

MIT
