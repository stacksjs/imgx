# Format Conversion

imgx supports converting between multiple image formats, each optimized for different use cases.

## Supported Formats

### WebP

Modern format with excellent compression and quality.

```bash
imgx optimize image.jpg -f webp
```

**Characteristics:**
- 25-35% smaller than JPEG at same quality
- Supports transparency (like PNG)
- Supports animation (like GIF)
- 95%+ browser support

**Best for:**
- General web images
- Photos with transparency needs
- Replacing both JPEG and PNG

### AVIF

Next-generation format with superior compression.

```bash
imgx optimize image.jpg -f avif
```

**Characteristics:**
- 30-50% smaller than WebP
- Excellent quality at low file sizes
- Growing browser support (~85%)
- Slower encoding

**Best for:**
- Maximum compression
- High-quality hero images
- Sites where performance is critical

### JPEG

Universal format for photographs.

```bash
imgx optimize image.png -f jpeg
```

**Characteristics:**
- Universal browser support
- Good for photographs
- Progressive loading support
- No transparency

**Best for:**
- Fallback format
- Email images
- Maximum compatibility

### PNG

Lossless format with transparency.

```bash
imgx optimize image.jpg -f png
```

**Characteristics:**
- Lossless compression
- Full transparency support
- Larger file sizes
- Best for graphics/icons

**Best for:**
- Screenshots
- Graphics with sharp edges
- Icons and logos

## Converting Images

### Basic Conversion

```typescript
import { convertImageFormat } from '@stacksjs/imgx'

// Convert JPEG to WebP
const result = await convertImageFormat('photo.jpg', 'webp')
console.log(`Saved ${result.savedPercentage.toFixed(2)}%`)
```

### With Options

```typescript
const result = await convertImageFormat('photo.jpg', 'avif', {
  quality: 80,
  outputDir: './optimized',
  lossless: false,
  filenamePrefix: 'converted-',
  filenameSuffix: '-hq',
})
```

### With Resize

```typescript
await convertImageFormat('photo.jpg', 'webp', {
  resize: { width: 800, height: 600 },
  quality: 85,
})
```

### Format-Specific Options

```typescript
// JPEG with progressive loading
await convertImageFormat('photo.png', 'jpeg', {
  quality: 90,
  progressive: true,
  chromaSubsampling: '4:4:4', // High quality chroma
})
```

## Multi-Format Output

Generate multiple formats for modern websites:

```typescript
import { batchProcessImages } from '@stacksjs/imgx'

// Create WebP and AVIF versions
const { results, summary } = await batchProcessImages('./images', {
  formats: ['webp', 'avif'],
  quality: 75,
  preserveStructure: true,
})

console.log(`Processed ${summary.successCount} images`)
console.log(`Total saved: ${summary.savedPercentage.toFixed(2)}%`)
```

### HTML Picture Element

Use multiple formats with fallback:

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description">
</picture>
```

## Format-Specific Quality

Set different quality levels per format:

```typescript
await batchProcessImages('./images', {
  formats: ['webp', 'avif', 'jpeg'],
  quality: {
    webp: 80,
    avif: 70,  // AVIF looks good at lower quality
    jpeg: 85
  }
})
```

## SVG Optimization

Optimize SVG files for smaller sizes:

```typescript
import { optimizeSvg } from '@stacksjs/imgx'

const result = await optimizeSvg('icon.svg', {
  output: 'icon.min.svg',
  multipass: true,
  removeComments: true,
  cleanupIDs: true,
  removeHiddenElements: true,
  removeEmptyAttrs: true,
  mergePaths: true,
  prettify: false, // Minify for smaller size
})
```

### SVG Optimization Options

| Option | Description | Default |
|--------|-------------|---------|
| `multipass` | Multiple optimization passes | `true` |
| `removeComments` | Remove XML comments | `true` |
| `cleanupIDs` | Clean up ID attributes | `true` |
| `removeHiddenElements` | Remove hidden elements | `true` |
| `removeEmptyAttrs` | Remove empty attributes | `true` |
| `mergePaths` | Merge similar paths | `true` |
| `convertShapeToPath` | Convert shapes to paths | `true` |
| `removeViewBox` | Remove viewBox (not recommended) | `false` |

## Image to SVG Conversion

Convert raster images to SVG using tracing:

```typescript
import { imageToSvg } from '@stacksjs/imgx'

// Black and white tracing
await imageToSvg('photo.jpg', {
  output: 'photo.svg',
  mode: 'bw',
  threshold: 128,
})

// Color tracing
await imageToSvg('logo.png', {
  output: 'logo.svg',
  mode: 'color',
  colorCount: 16,
})

// Posterized effect
await imageToSvg('image.jpg', {
  output: 'posterized.svg',
  mode: 'posterized',
  steps: 8,
})
```

## Format Comparison

| Format | Size | Quality | Transparency | Animation | Browser Support |
|--------|------|---------|--------------|-----------|-----------------|
| AVIF | Smallest | Excellent | Yes | Yes | ~85% |
| WebP | Small | Excellent | Yes | Yes | ~95% |
| JPEG | Medium | Good | No | No | 100% |
| PNG | Large | Perfect | Yes | No | 100% |
| GIF | Variable | Limited | Yes | Yes | 100% |

## Recommended Strategy

```typescript
// Modern web strategy with fallbacks
await batchProcessImages('./images', {
  formats: ['avif', 'webp', 'jpeg'],
  quality: {
    avif: 70,
    webp: 80,
    jpeg: 85
  },
  responsive: true,
  responsiveSizes: [320, 768, 1024, 1920]
})
```

## Next Steps

- Learn [Optimization Techniques](/guide/optimization) for best results
- Configure defaults in [Configuration](/config)
