# Format Conversion

imgx makes it easy to convert images between different formats, helping you adopt modern formats like WebP and AVIF for better web performance.

## Supported Conversions

imgx supports conversion between all major image formats:

- **JPEG/JPG** → WebP, AVIF, PNG
- **PNG** → WebP, AVIF, JPEG
- **WebP** → JPEG, PNG, AVIF
- **AVIF** → WebP, JPEG, PNG
- **GIF** → WebP (animated), APNG, MP4

## Benefits of Modern Formats

| Format | Benefits | Browser Support |
|--------|----------|----------------|
| **WebP** | 25-35% smaller than JPEG/PNG with similar quality | Chrome, Firefox, Edge, Safari 14+ |
| **AVIF** | 50%+ smaller than JPEG with better quality | Chrome, Firefox 92+, Edge |
| **JPEG XL** | 60%+ smaller with superior quality | Limited (experimental) |

## Basic Usage

### CLI

```bash
# Convert a single image to WebP
imgx convert image.jpg --format webp

# Convert an image to AVIF with specific quality
imgx convert image.jpg --format avif --quality 75

# Convert and specify output path
imgx convert image.jpg --format webp --output images/image.webp

# Convert multiple images using glob pattern
imgx convert "images/*.jpg" --format webp --output-dir converted/
```

### JavaScript/TypeScript API

```ts
import { convert } from '@stacksjs/imgx'

// Basic conversion
await convert('path/to/image.jpg', {
  format: 'webp',
})

// With custom options
await convert('path/to/image.jpg', {
  format: 'avif',
  quality: 75,
  output: 'path/to/output.avif',
  lossless: false,
  effort: 7,
})
```

## Format-Specific Options

### WebP Options

```ts
await convert('image.jpg', {
  format: 'webp',
  quality: 80, // 0-100
  lossless: false, // true for lossless compression
  effort: 5, // 0-6, higher = better compression but slower
  smartSubsample: true, // Reduces color artifacts
})
```

### AVIF Options

```ts
await convert('image.jpg', {
  format: 'avif',
  quality: 65, // 0-100, typically lower values work well for AVIF
  lossless: false,
  effort: 7, // 0-10, higher = better compression but slower
})
```

### JPEG Options

```ts
await convert('image.png', {
  format: 'jpeg',
  quality: 85,
  progressive: true, // Enable progressive loading
  optimizeCoding: true, // Optimize Huffman tables
  mozjpeg: true, // Use mozjpeg for better compression
  chromaSubsampling: '4:2:0', // Chroma subsampling level
})
```

### PNG Options

```ts
await convert('image.jpg', {
  format: 'png',
  compressionLevel: 9, // 0-9, higher = better compression but slower
  palette: true, // Convert to palette-based PNG if possible
  adaptiveFiltering: true, // Optimize PNG filtering
})
```

## Batch Conversion

You can convert multiple images at once with the batch command:

```bash
# Convert all JPGs in a directory to WebP
imgx batch ./images --formats webp --quality 80

# Convert to multiple formats with custom quality per format
imgx batch ./images --formats webp,avif --quality.webp 80 --quality.avif 65
```

Or programmatically:

```ts
import { batchProcess } from '@stacksjs/imgx'

await batchProcess('./images/**/*.{jpg,png}', {
  formats: ['webp', 'avif'],
  quality: {
    webp: 80,
    avif: 65,
  },
  outputDir: './optimized',
})
```

## Advanced Usage

### Custom Filenames

You can customize how the converted filenames are generated:

```bash
# Add a suffix to the filename
imgx convert image.jpg --format webp --filename-suffix '-optimized'

# Add a prefix to the filename
imgx convert image.jpg --format webp --filename-prefix 'web-'
```

Or using the API:

```ts
await convert('image.jpg', {
  format: 'webp',
  filenamePrefix: 'web-',
  filenameSuffix: '-optimized',
})
```

### Preserving Metadata

By default, imgx strips metadata during conversion to reduce file size. You can preserve it if needed:

```bash
imgx convert image.jpg --format webp --preserve-metadata
```

```ts
await convert('image.jpg', {
  format: 'webp',
  preserveMetadata: true,
})
```

### Converting Animated Images

imgx can convert animated GIFs to animated WebP or APNG:

```bash
# Convert animated GIF to animated WebP
imgx convert animation.gif --format webp

# Convert animated GIF to APNG
imgx convert animation.gif --format png
```

## Fallbacks for Browser Compatibility

When using modern formats like WebP or AVIF, you might need fallbacks for older browsers. imgx can help generate HTML with the appropriate `<picture>` element:

```bash
imgx convert image.jpg --format webp,avif --generate-html
```

This will produce HTML similar to:

```html
<picture>
  <source type="image/avif" srcset="image.avif">
  <source type="image/webp" srcset="image.webp">
  <img src="image.jpg" alt="Image description" width="800" height="600">
</picture>
```

## Configuration

You can set default conversion options in your imgx.config.ts file:

```ts
// imgx.config.ts
export default {
  conversion: {
    quality: 80,
    lossless: false,
    progressive: true,
    filenamePrefix: '',
    filenameSuffix: '',
    preserveMetadata: false,
    optimizationLevel: 6,
    effort: 6,
    chromaSubsampling: '4:2:0',
    smartSubsample: true,
  },
}
```
