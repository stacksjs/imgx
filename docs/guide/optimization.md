# Image Optimization

Learn how to optimize images for the best balance of quality and file size.

## Basic Optimization

### Quality Settings

Control compression quality (1-100):

```bash
# High quality (larger files)
imgx optimize image.jpg -q 90

# Balanced (recommended)
imgx optimize image.jpg -q 75

# Maximum compression (smaller files)
imgx optimize image.jpg -q 50
```

```typescript
await process({
  input: 'image.jpg',
  output: 'optimized.webp',
  quality: 75,
  format: 'webp'
})
```

### Progressive Loading

Enable progressive loading for better perceived performance:

```bash
imgx optimize image.jpg -p
```

```typescript
await process({
  input: 'image.jpg',
  progressive: true
})
```

### Metadata Stripping

Remove EXIF data for privacy and smaller files:

```bash
# Preserve metadata
imgx optimize image.jpg -m

# Strip metadata (default)
imgx optimize image.jpg
```

```typescript
await process({
  input: 'image.jpg',
  stripMetadata: true // default
})
```

## Resizing

### Basic Resize

```bash
# Resize to width
imgx optimize image.jpg -r 800

# Resize to specific dimensions
imgx optimize image.jpg -r 800x600

# Resize by percentage
imgx optimize image.jpg -r 50%
```

```typescript
await process({
  input: 'image.jpg',
  resize: { width: 800, height: 600 }
})
```

### Maintaining Aspect Ratio

```typescript
// Resize to width, maintain aspect ratio
await process({
  input: 'image.jpg',
  resize: { width: 800 }
})

// Resize to fit within bounds
await process({
  input: 'image.jpg',
  resize: { width: 800, height: 600, fit: 'inside' }
})
```

## Responsive Images

Generate multiple sizes for responsive layouts:

```bash
imgx optimize hero.jpg --responsive --responsive-sizes 320,768,1024,1920
```

```typescript
await process({
  input: 'hero.jpg',
  responsive: true,
  responsiveSizes: [320, 768, 1024, 1920],
  format: 'webp'
})
```

### Output Structure

```
hero-320.webp
hero-768.webp
hero-1024.webp
hero-1920.webp
```

### Using in HTML

```html
<img
  src="hero-1024.webp"
  srcset="
    hero-320.webp 320w,
    hero-768.webp 768w,
    hero-1024.webp 1024w,
    hero-1920.webp 1920w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Hero image"
>
```

## Placeholder Generation

Create lightweight placeholders for lazy loading:

### Blur Placeholder (LQIP)

```typescript
import { generatePlaceholder } from '@stacksjs/imgx'

const placeholder = await generatePlaceholder('hero.jpg', {
  width: 20,
  blurLevel: 40,
  quality: 50,
  format: 'webp',
  base64Encode: true
})

// Use in HTML
const html = `
<div style="background-image: url(${placeholder.dataURL})">
  <img src="hero.jpg" loading="lazy">
</div>
`
```

### ThumbHash Placeholder

Even smaller than blur placeholders:

```typescript
const thumbHash = await generatePlaceholder('hero.jpg', {
  strategy: 'thumbhash'
})
```

### Dominant Color Placeholder

Fastest loading option:

```typescript
const colorPlaceholder = await generatePlaceholder('hero.jpg', {
  strategy: 'dominant-color'
})
```

### Pixelated Placeholder

Retro effect:

```typescript
const pixelated = await generatePlaceholder('hero.jpg', {
  strategy: 'pixelate',
  width: 30
})
```

## Batch Processing

Process entire directories efficiently:

```bash
# Recursive processing
imgx optimize ./images -R -f webp

# Skip existing files
imgx optimize ./images -R --skip-existing

# Create backups
imgx optimize ./images -R --backup
```

```typescript
import { batchProcessImages } from '@stacksjs/imgx'

const { results, summary } = await batchProcessImages('./images', {
  formats: ['webp', 'avif'],
  quality: 75,
  resize: { width: 1200 },
  recursive: true,
  skipExisting: true,
  preserveStructure: true,
  filenameTemplate: '[name]-optimized.[format]'
})

console.log(`Processed ${summary.successCount} of ${summary.totalFiles} images`)
console.log(`Saved ${summary.savedPercentage.toFixed(2)}%`)
```

### Progress Tracking

```typescript
await batchProcessImages('./images', {
  formats: ['webp'],
  progressCallback: (progress) => {
    console.log(`${progress.percentage.toFixed(0)}% - ${progress.currentFile}`)
  }
})
```

### Optimization Presets

```typescript
await batchProcessImages('./images', {
  optimizationPreset: 'web' // or 'quality', 'performance'
})
```

## Image Transformations

### Watermarking

Add text or image watermarks:

```typescript
import { applyWatermark } from '@stacksjs/imgx'

// Text watermark
await applyWatermark('image.jpg', {
  text: 'Copyright 2024',
  position: 'bottom-right',
  opacity: 0.7,
  output: 'watermarked.jpg',
  textOptions: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.8)',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: 10
  }
})

// Image watermark
await applyWatermark('photo.jpg', {
  image: 'logo.png',
  position: 'bottom-right',
  scale: 0.2,
  opacity: 0.5,
  output: 'branded.jpg'
})

// Tiled watermark
await applyWatermark('background.jpg', {
  image: 'small-logo.png',
  tiled: true,
  opacity: 0.15
})
```

### Custom Transformations

```typescript
await batchProcessImages('./images', {
  formats: ['webp'],
  transformations: [
    { type: 'grayscale' },
    { type: 'blur', options: { sigma: 2 } }
  ]
})
```

## App Icon Generation

Generate app icons for iOS and macOS:

```bash
# All platforms
imgx app-icon source-icon.png

# macOS only
imgx app-icon source-icon.png -p macos

# iOS only
imgx app-icon source-icon.png -p ios

# Custom output
imgx app-icon source-icon.png -o ./assets
```

```typescript
import { generateAppIcons } from '@stacksjs/imgx'

await generateAppIcons('source-icon.png', {
  platform: 'all', // 'macos', 'ios', or 'all'
  outputDir: './assets/app-icons'
})
```

## Sprite Generation

Combine multiple icons into a sprite sheet:

```bash
imgx sprite ./icons ./dist --retina --optimize
```

```typescript
import { generateSprite } from '@stacksjs/imgx'

await generateSprite({
  images: ['icon1.png', 'icon2.png', 'icon3.png'],
  output: './dist',
  retina: true,
  format: 'webp',
  padding: 2,
  prefix: 'icon'
})
```

## Image Analysis

Analyze optimization potential:

```bash
imgx analyze ./images -o report.json --ci
```

```typescript
import { analyzeImage } from '@stacksjs/imgx'

const report = await analyzeImage('image.jpg')
console.log(`Optimization potential: ${report.optimizationPotential}%`)
console.log(`Current size: ${report.currentSize}`)
console.log(`Estimated optimized: ${report.estimatedSize}`)
```

## Development Server

On-the-fly optimization during development:

```bash
imgx serve ./public -p 3000
```

Access optimized images via URL parameters:

```
http://localhost:3000/image.jpg?format=webp&quality=75&size=800x600
```

### URL Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `format` | Output format | `webp`, `avif` |
| `quality` | Compression quality | `75` |
| `size` | Resize dimensions | `800x600` |
| `width` | Resize width | `800` |
| `height` | Resize height | `600` |

## Watch Mode

Automatically optimize images during development:

```bash
imgx optimize ./src/images -w -f webp
```

## Best Practices

1. **Use WebP as primary format** with JPEG fallback
2. **Generate multiple sizes** for responsive images
3. **Strip metadata** unless specifically needed
4. **Use progressive loading** for large images
5. **Implement lazy loading** with placeholders
6. **Cache optimized images** to avoid re-processing
7. **Set appropriate quality** (75-80 for most cases)

## Next Steps

- Learn about [Format Conversion](/guide/formats)
- Configure defaults in [Configuration](/config)
