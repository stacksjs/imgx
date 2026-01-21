# Getting Started

imgx is a powerful image optimization toolkit designed for modern web development. This guide will help you get started with optimizing your images.

## Installation

Install imgx using your preferred package manager:

::: code-group

```bash [bun]
bun install -d @stacksjs/imgx
```

```bash [npm]
npm install --save-dev @stacksjs/imgx
```

```bash [yarn]
yarn add -D @stacksjs/imgx
```

```bash [pnpm]
pnpm add -D @stacksjs/imgx
```

:::

## Quick Start

### Basic Optimization

Optimize a single image:

```bash
# Optimize with default settings
imgx optimize input.jpg

# Optimize with custom quality
imgx optimize input.jpg -q 75

# Convert to WebP
imgx optimize input.jpg output.webp -f webp
```

### Batch Processing

Optimize an entire directory:

```bash
# Process all images in a directory
imgx optimize ./images -R -f webp

# Watch mode for development
imgx optimize ./src/images -w -f webp
```

### Development Server

Start an on-the-fly optimization server:

```bash
imgx serve ./public -p 3000

# Access optimized images via URL:
# http://localhost:3000/image.jpg?format=webp&quality=75&size=800x600
```

## Library Usage

Use imgx programmatically in your TypeScript projects:

```typescript
import { process, generatePlaceholder, convertImageFormat } from '@stacksjs/imgx'

// Basic optimization
await process({
  input: 'input.jpg',
  output: 'output.webp',
  quality: 75,
  format: 'webp'
})

// Generate responsive images
await process({
  input: 'hero.jpg',
  responsive: true,
  responsiveSizes: [320, 768, 1024, 1920],
  format: 'webp'
})

// Generate placeholder for lazy loading
const placeholder = await generatePlaceholder('hero.jpg', {
  width: 20,
  blurLevel: 40,
  quality: 50,
  format: 'webp',
  base64Encode: true
})

console.log(placeholder.dataURL) // Use as background while loading
```

## Core Features

### Image Optimization

- **Lossy & lossless compression** - Choose the right balance between quality and size
- **Smart quality optimization** - Automatic quality selection based on image content
- **Metadata stripping** - Remove EXIF data for privacy and smaller files
- **Progressive encoding** - Better perceived loading performance

### Format Support

- **WebP conversion** - Modern format with excellent compression
- **AVIF support** - Next-gen format with superior compression
- **JPEG/PNG optimization** - Improved compression for traditional formats
- **SVG minification** - Smaller vector files
- **Animated GIF optimization** - Reduce GIF file sizes

### Modern Web Features

- **Responsive images** - Generate multiple sizes for srcset
- **Art direction** - Create variations for different viewports
- **ThumbHash placeholders** - Ultra-lightweight image placeholders
- **Sprite sheet generation** - Combine icons into single files
- **OG Image generation** - Create social media images

## CLI Quick Reference

```bash
# Optimization
imgx optimize [input] [output]

# Options
-q, --quality <number>     Image quality (1-100, default: 80)
-r, --resize <string>      Resize image (e.g., "50%" or "800x600")
-f, --format <string>      Output format (jpeg, png, webp, avif)
-p, --progressive          Enable progressive mode (default: true)
-m, --preserve-metadata    Preserve image metadata
-w, --watch                Watch for file changes
-R, --recursive            Process directories recursively
-t, --thumbhash            Generate ThumbHash placeholder
--responsive               Generate responsive images
--skip-existing            Skip already optimized files
--backup                   Create backup of original files
```

## Configuration

Create an `imgx.config.ts` file for default settings:

```typescript
import type { ImgxConfig } from '@stacksjs/imgx'

export default {
  // General options
  verbose: true,
  cache: true,
  cacheDir: '.imgx-cache',

  // Default optimization settings
  quality: 75,
  format: 'webp',
  progressive: true,
  stripMetadata: true,

  // Responsive image settings
  responsive: {
    sizes: [320, 768, 1024, 1920],
    formats: ['webp', 'avif'],
    quality: 75
  },

  // Development server
  server: {
    port: 3000,
    cache: true,
    cors: true
  }
} satisfies ImgxConfig
```

## Common Use Cases

### Optimize for Web

```typescript
await process({
  input: 'photo.jpg',
  output: 'photo.webp',
  quality: 80,
  format: 'webp',
  progressive: true,
  stripMetadata: true
})
```

### Create App Icons

```bash
imgx app-icon source-icon.png -p all -o ./assets
```

### Generate Placeholders

```typescript
const placeholder = await generatePlaceholder('hero.jpg', {
  strategy: 'thumbhash' // Ultra-lightweight placeholder
})
```

### Batch Convert to WebP

```bash
imgx optimize ./images -R -f webp --skip-existing
```

## Next Steps

- Learn about [Format Conversion](/guide/formats) for choosing the right format
- Explore [Optimization Techniques](/guide/optimization) for best practices
- Configure defaults in your [Configuration](/config) file
