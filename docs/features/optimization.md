# Image Optimization

imgx provides powerful image optimization capabilities for a wide range of formats, helping you reduce file sizes without significant quality loss.

## Supported Formats

- **JPEG/JPG**: Advanced compression with mozjpeg support
- **PNG**: Efficient lossless and lossy compression
- **WebP**: Superior compression with excellent quality
- **AVIF**: Next-generation format with the best compression ratios
- **SVG**: SVG optimization and minification

## Basic Usage

### CLI

```bash
# Optimize a single image with default settings
imgx optimize path/to/image.jpg

# Specify quality
imgx optimize path/to/image.jpg --quality 75

# Specify output format
imgx optimize path/to/image.jpg --format webp

# Specify output path
imgx optimize path/to/image.jpg --output path/to/optimized.jpg
```

### JavaScript/TypeScript API

```ts
import { optimize } from '@stacksjs/imgx'

// Basic optimization
const result = await optimize('path/to/image.jpg')

// With options
const resultWithOptions = await optimize('path/to/image.jpg', {
  quality: 75,
  format: 'webp',
  output: 'path/to/optimized.webp',
})

console.log(`Original size: ${result.inputSize} bytes`)
console.log(`Optimized size: ${result.outputSize} bytes`)
console.log(`Saved: ${result.saved} bytes (${result.savedPercentage.toFixed(2)}%)`)
```

## Advanced Options

imgx provides format-specific optimization settings that can be configured:

```ts
// In imgx.config.ts
export default {
  optimization: {
    // Global settings
    quality: 80,
    lossless: false,
    progressive: true,
    effort: 7,
    preserveMetadata: false,

    // Format-specific settings
    jpeg: {
      quality: 85,
      progressive: true,
      optimizeCoding: true,
      mozjpeg: true,
      chromaSubsampling: '4:2:0',
    },
    png: {
      quality: 80,
      progressive: true,
      compressionLevel: 9,
      effort: 7,
      palette: true,
      adaptiveFiltering: true,
    },
    webp: {
      quality: 80,
      lossless: false,
      effort: 6,
      smartSubsample: true,
    },
    avif: {
      quality: 70,
      lossless: false,
      effort: 7,
    },
  },
}
```

### Preserving Metadata

By default, imgx strips most metadata to achieve better compression. You can preserve metadata like EXIF information:

```bash
imgx optimize path/to/image.jpg --preserve-metadata
```

Or in the API:

```ts
await optimize('path/to/image.jpg', {
  preserveMetadata: true,
})
```

## Analyzing Images

imgx can analyze your images and provide optimization recommendations:

```bash
imgx analyze path/to/image.jpg
```

This will provide information about:

- Current file size and potential savings
- Current format and recommended format
- Quality level analysis
- Metadata presence
- Responsive sizing recommendations

## Progressive Loading

Enable progressive loading for formats that support it:

```bash
imgx optimize path/to/image.jpg --progressive
```

Or in your configuration:

```ts
// imgx.config.ts
export default {
  progressive: true,
}
```
