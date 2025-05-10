<p align="center"><img src="https://github.com/stacksjs/imgx/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# imgx

> A powerful image optimization toolkit for modern web development.

## Table of Contents

- [Features](#features)
- [Installation](#install)
- [Getting Started](#get-started)
- [Configuration](#configuration)
- [CLI Reference](#cli-reference)
- [Feature Documentation](#feature-documentation)
  - [App Icon Generation](#app-icon-generation)
  - [Image Placeholders](#image-placeholders)
  - [Batch Processing](#batch-processing)
  - [Format Conversion](#format-conversion)
  - [Image Watermarking](#image-watermarking)
  - [SVG Optimization](#svg-optimization)
  - [Image to SVG Conversion](#image-to-svg-conversion)
- [Contributing](#contributing)
- [Community](#community)
- [Credits](#credits)
- [License](#license)

## Features

- **Advanced Image Optimization**
  - Lossy & lossless compression
  - Smart quality optimization
  - Metadata stripping
  - Color profile management

- **Format Support**
  - WebP, AVIF conversion
  - JPEG, PNG optimization
  - SVG minification
  - Animated GIF optimization

- **Modern Web Features**
  - Responsive image generation
  - Art direction support
  - Lazy loading helpers
  - ThumbHash placeholders
  - Sprite sheet generation
  - OG Image generation
  - Low-resolution image placeholders
  - Batch image processing

- **Developer Experience**
  - Watch mode for development
  - Development server with on-the-fly optimization
  - CI/CD integration
  - Detailed analysis and reporting
  - Progress indicators

- **Privacy & Performance**
  - Metadata stripping
  - Configurable optimization levels
  - Cache control
  - Web-optimized by default

## Install

```bash
bun install -d @stacksjs/imgx
npm install --save-dev @stacksjs/imgx
yarn add -D @stacksjs/imgx
pnpm add -D @stacksjs/imgx
```

## Get Started

### CLI Usage

Basic optimization:

```bash
# Optimize a single image
imgx optimize input.jpg -q 75

# Convert to WebP
imgx optimize input.jpg output.webp -f webp

# Optimize a directory of images
imgx optimize ./images -R -f webp

# Watch mode for development
imgx optimize ./src/images -w -f webp
```

Advanced features:

```bash
# Generate responsive images
imgx optimize hero.jpg --responsive --responsive-sizes 320,768,1024,1920

# Create sprite sheet
imgx sprite ./icons ./dist --retina --optimize

# Generate thumbnails with ThumbHash
imgx optimize input.jpg -t --thumbhash-size 64x64

# Analyze image optimization potential
imgx analyze ./images -o report.json --ci
```

Development server:

```bash
# Start dev server with on-the-fly optimization
imgx serve ./public -p 3000

# Access optimized images:
# http://localhost:3000/image.jpg?format=webp&quality=75&size=800x600
```

### Library Usage

```ts
import {
  analyzeImage,
  batchProcessImages,
  convertImageFormat,
  generatePlaceholder,
  generateSprite,
  process
} from '@stacksjs/imgx'

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

// Create sprite sheet
await generateSprite({
  images: ['icon1.png', 'icon2.png'],
  output: './dist',
  retina: true,
  format: 'webp'
})

// Generate low-resolution placeholder
const placeholder = await generatePlaceholder('hero.jpg', {
  width: 20,
  blurLevel: 40,
  quality: 50,
  format: 'webp',
  base64Encode: true, // Get base64 data URL
})
// Use placeholder.dataURL in your HTML for LQIP technique

// Generate thumbhash placeholder
const thumbhashPlaceholder = await generatePlaceholder('hero.jpg', {
  thumbhash: true,
})
// Use thumbhashPlaceholder.dataURL for an efficient placeholder

// Convert image to a different format
const webpPath = await convertImageFormat('image.jpg', 'webp', {
  quality: 80,
  outputDir: './dist',
})

// Process a directory of images in batch
const results = await analyzeImage('image.jpg')
console.log(report.optimizationPotential)
```

## Configuration

Create an `imgx.config.ts` file:

```ts
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

  // Sprite generation
  sprites: {
    retina: true,
    padding: 2,
    prefix: 'icon',
    format: 'webp'
  },

  // Development server
  server: {
    port: 3000,
    cache: true,
    cors: true
  }
} satisfies ImgxConfig
```

## CLI Reference

```bash
imgx optimize [input] [output]

Options:
  -q, --quality <number>     Image quality (1-100) (default: 80)
  -r, --resize <string>      Resize image (e.g., "50%" or "800x600")
  -f, --format <string>      Output format (jpeg, png, webp, avif)
  -p, --progressive         Enable progressive mode (default: true)
  -m, --preserve-metadata   Preserve image metadata
  -w, --watch              Watch for file changes
  -R, --recursive          Process directories recursively
  -t, --thumbhash          Generate ThumbHash placeholder
  --responsive             Generate responsive images
  --skip-existing         Skip already optimized files
  --backup                Create backup of original files

Examples:
  $ imgx optimize input.jpg -q 75 -r 50%
  $ imgx optimize ./images -f webp -R
  $ imgx optimize input.jpg -t --thumbhash-size 64x64
  $ imgx sprite ./icons ./dist --retina --optimize
  $ imgx analyze ./images --ci --threshold 500KB
```

## Feature Documentation

For more detailed documentation on each feature, visit our [documentation site](https://imgx.stacksjs.dev).

### App Icon Generation

You can now use imgx to generate properly sized app icons for macOS and iOS applications from a single source image.

[Read the full App Icon documentation →](https://imgx.stacksjs.dev/features/app-icons)

#### Command Line Usage

```bash
# Generate app icons for all platforms (macOS and iOS)
imgx app-icon source-icon.png

# Generate only macOS app icons
imgx app-icon source-icon.png -p macos

# Generate only iOS app icons
imgx app-icon source-icon.png -p ios

# Specify a custom output directory
imgx app-icon source-icon.png -o ./my-app/assets
```

#### Programmatic Usage

```typescript
import { generateAppIcons } from 'imgx'

// Generate app icons for all platforms
await generateAppIcons('path/to/source-icon.png')

// Generate only macOS app icons
await generateAppIcons('path/to/source-icon.png', {
  platform: 'macos',
  outputDir: './my-app/assets'
})
```

### Configuration

You can configure the app icon generation in your `imgx.config.ts` file:

```typescript
import type { ImgxConfig } from 'imgx'

const config: ImgxConfig = {
  // Other configuration options...

  appIcon: {
    outputDir: 'assets/app-icons', // Default output directory
    platform: 'all', // Default platform target ('macos', 'ios', or 'all')
  },
}

export default config
```

### Output

The tool will generate:

1. All required app icon sizes for the selected platform(s)
2. A properly formatted `Contents.json` file for Xcode
3. A README.md with installation instructions

## Image Placeholders

Imgx provides powerful image placeholder generation for improved page load performance:

[Read the full Image Placeholders documentation →](https://imgx.stacksjs.dev/features/placeholders)

```ts
// Generate a low-resolution blurred placeholder
const placeholder = await generatePlaceholder('image.jpg', {
  width: 20, // Small width for efficiency
  blurLevel: 40, // Higher values = more blur
  quality: 50, // Lower quality for smaller size
  format: 'webp', // WebP is usually smaller
})

// Use in HTML
const html = `
<div class="image-wrapper" style="background-image: url(${placeholder.dataURL})">
  <img src="image.jpg" loading="lazy" width="${placeholder.width}" height="${placeholder.height}">
</div>
`

// ThumbHash alternative (even smaller, fixed quality)
const thumbHash = await generatePlaceholder('image.jpg', {
  strategy: 'thumbhash',
})

// Use dominant color as placeholder for even faster loading
const colorPlaceholder = await generatePlaceholder('image.jpg', {
  strategy: 'dominant-color',
})

// Pixelated placeholder for a retro effect
const pixelatedPlaceholder = await generatePlaceholder('image.jpg', {
  strategy: 'pixelate',
  width: 30,
})

// Generate with CSS helper
const placeholderWithCSS = await generatePlaceholder('image.jpg', {
  strategy: 'blur',
  cssFilter: true,
})

// Use the CSS class in your HTML
console.log(placeholderWithCSS.css)
// .placeholder-image { background-size: cover; ... }
```

## Batch Processing

Process entire directories of images:

[Read the full Batch Processing documentation →](https://imgx.stacksjs.dev/features/batch)

```ts
// Convert all JPG/PNG images to WebP and AVIF
const { results, summary } = await batchProcessImages('./images', {
  formats: ['webp', 'avif'],
  quality: 75,
  resize: { width: 1200 }, // Optional resize
  recursive: true, // Process subdirectories
  skipExisting: true, // Skip already processed files
  preserveStructure: true, // Keep directory structure
  filenameTemplate: '[name]-optimized.[format]', // Custom naming
})

console.log(`Processed ${summary.successCount} of ${summary.totalFiles} images`)
console.log(`Total saved: ${summary.saved} bytes (${summary.savedPercentage.toFixed(2)}%)`)

// With progress tracking
await batchProcessImages('./images', {
  formats: ['webp'],
  progressCallback: (progress) => {
    console.log(`Progress: ${progress.percentage.toFixed(2)}% (${progress.completed}/${progress.total})`)
  }
})

// With optimization presets
await batchProcessImages('./images', {
  formats: ['webp', 'jpeg'],
  optimizationPreset: 'quality', // 'web', 'quality', 'performance'
})

// With custom transformations
await batchProcessImages('./images', {
  formats: ['webp'],
  transformations: [
    { type: 'grayscale' },
    { type: 'blur', options: { sigma: 2 } },
  ]
})

// Format-specific quality settings
await batchProcessImages('./images', {
  formats: ['webp', 'avif', 'jpeg'],
  quality: {
    webp: 80,
    avif: 70,
    jpeg: 85
  }
})
```

## Format Conversion

Easily convert between image formats:

[Read the full Format Conversion documentation →](https://imgx.stacksjs.dev/features/conversion)

```ts
// Convert a JPEG to WebP
const result = await convertImageFormat('photo.jpg', 'webp')
console.log(`Converted to ${result.outputPath} (saved ${result.savedPercentage.toFixed(2)}%)`)

// Convert an image with options
const avifResult = await convertImageFormat('photo.jpg', 'avif', {
  quality: 80,
  outputDir: './optimized',
  lossless: false,
  filenamePrefix: 'converted-',
  filenameSuffix: '-hq',
})

// Convert with resize
await convertImageFormat('photo.jpg', 'webp', {
  resize: { width: 800, height: 600 },
  quality: 85,
})

// Format-specific optimizations
await convertImageFormat('photo.png', 'jpeg', {
  quality: 90,
  progressive: true,
  chromaSubsampling: '4:4:4', // High quality chroma
})

// Batch convert all PNG files to WebP
const pngFiles = await getFiles('./images', { patterns: ['**/*.png'] })
await Promise.all(pngFiles.map(file =>
  convertImageFormat(file, 'webp', { outputDir: './webp' })
))
```

## Image Watermarking

Add text or image watermarks to your images:

```ts
// Add text watermark
const watermarked = await applyWatermark('image.jpg', {
  text: 'Copyright 2023',
  position: 'bottom-right', // 'center', 'top-left', 'bottom-right', etc.
  opacity: 0.7,
  output: 'watermarked-image.jpg',
  textOptions: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.8)',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
  }
})

// Add image watermark
await applyWatermark('photo.jpg', {
  image: 'logo.png',
  position: 'bottom-right',
  scale: 0.2, // 20% of the main image size
  opacity: 0.5,
  output: 'branded-photo.jpg',
})

// Create a tiled watermark pattern
await applyWatermark('background.jpg', {
  image: 'small-logo.png',
  tiled: true,
  opacity: 0.15,
  output: 'watermarked-background.jpg',
})

// Apply rotated watermark
await applyWatermark('certificate.jpg', {
  text: 'VERIFIED',
  position: 'center',
  rotate: 45, // 45 degrees rotation
  opacity: 0.3,
  textOptions: {
    fontSize: 72,
    color: 'rgba(255, 0, 0, 0.5)',
  }
})

// Apply watermark to images in batch
const images = await getFiles('./photos', { patterns: ['**/*.jpg'] })
await Promise.all(images.map(image =>
  applyWatermark(image, {
    text: '© Company Name',
    position: 'bottom-right',
    output: image.replace('.jpg', '.watermarked.jpg'),
  })
))
```

## SVG Optimization

Optimize SVG files for web use with comprehensive options:

[Read the full SVG Optimization documentation →](https://imgx.stacksjs.dev/features/svg)

```ts
// Basic SVG optimization
const result = await optimizeSvg('icon.svg', {
  output: 'optimized-icon.svg',
})
console.log(`Optimized SVG: saved ${result.savedPercentage.toFixed(2)}%`)

// Advanced SVG optimization with detailed options
await optimizeSvg('logo.svg', {
  output: 'optimized-logo.svg',
  multipass: true, // Run multiple optimization passes
  removeComments: true, // Remove comments
  cleanupIDs: true, // Clean up ID attributes
  removeHiddenElements: true, // Remove hidden elements
  removeEmptyAttrs: true, // Remove empty attributes
  removeEmptyContainers: true, // Remove empty containers
  mergePaths: true, // Merge paths when possible
  convertShapeToPath: true, // Convert basic shapes to paths
  removeViewBox: false, // Keep viewBox attribute (important for responsive SVGs)
  prettify: false, // Minify output for smaller file size
})

// Optimize SVG string content
const svgContent = '<svg>...</svg>'
const optimized = await optimizeSvg(svgContent, {
  removeComments: true,
  cleanupIDs: true,
})
console.log(optimized.content) // Get the optimized SVG content

// Optimize with prefix IDs (useful for embedding multiple SVGs)
await optimizeSvg('icon.svg', {
  output: 'prefixed-icon.svg',
  prefixIds: 'icon-', // All IDs will be prefixed with 'icon-'
})
```

## Image to SVG Conversion

Convert raster images to scalable SVG using tracing:

[Read the full Image to SVG Conversion documentation →](https://imgx.stacksjs.dev/features/svg#converting-raster-images-to-svg)

```ts
// Convert image to black and white SVG
const result = await imageToSvg('photo.jpg', {
  output: 'photo.svg',
  mode: 'bw', // Black and white mode
  threshold: 128, // Threshold for black/white conversion (0-255)
})

// Convert image to color SVG
await imageToSvg('logo.png', {
  output: 'logo.svg',
  mode: 'color', // Full color tracing
  colorCount: 16, // Number of colors to use (lower = simpler SVG)
})

// Convert with posterization effect
await imageToSvg('image.jpg', {
  output: 'posterized.svg',
  mode: 'posterized', // Posterized effect
  steps: 8, // Number of color levels
})

// Add background color to resulting SVG
await imageToSvg('icon.png', {
  output: 'icon-with-bg.svg',
  mode: 'bw',
  background: '#f0f0f0', // Add light gray background
})

// Convert and optimize in one step
await imageToSvg('photo.jpg', {
  output: 'photo.svg',
  mode: 'bw',
  optionsSvg: { // Apply SVG optimization options
    removeComments: true,
    cleanupIDs: true,
    convertShapeToPath: true,
  }
})
```

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/stacks/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

“Software that is free, but hopes for a postcard.” We love receiving postcards from around the world showing where `imgx` is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## Credits

- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@stacksjs/imgx?style=flat-square
[npm-version-href]: https://npmjs.com/package/@stacksjs/imgx
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/imgx/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/imgx/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/imgx/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/imgx -->
