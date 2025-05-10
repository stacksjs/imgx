# Core API Reference

This page documents the core API functions available in imgx.

## Image Processing

### `optimize`

Optimizes an image by applying compression techniques suitable for the image format.

```ts
async function optimize(
  input: string | Buffer,
  options?: {
    quality?: number
    format?: 'jpeg' | 'png' | 'webp' | 'avif'
    output?: string
    progressive?: boolean
    preserveMetadata?: boolean
  }
): Promise<OptimizeResult>
```

**Parameters:**
- `input`: Path to the image file or a Buffer containing the image data
- `options`: Optional configuration options
  - `quality`: Output quality, 1-100
  - `format`: Output format
  - `output`: Output file path
  - `progressive`: Enable progressive mode if format supports it
  - `preserveMetadata`: Whether to preserve image metadata

**Returns:** Promise resolving to `OptimizeResult` with properties:
- `inputPath`: Path to input file
- `outputPath`: Path to output file
- `inputSize`: Size of input file in bytes
- `outputSize`: Size of output file in bytes
- `saved`: Bytes saved
- `savedPercentage`: Percentage of size reduction

**Example:**
```ts
import { optimize } from '@stacksjs/imgx'

const result = await optimize('path/to/image.jpg', {
  quality: 80,
  format: 'webp',
})

console.log(`Saved ${result.saved} bytes (${result.savedPercentage.toFixed(2)}%)`)
```

### `convert`

Converts an image from one format to another.

```ts
async function convert(
  input: string | Buffer,
  options: {
    format: 'jpeg' | 'png' | 'webp' | 'avif'
    output?: string
    quality?: number
    lossless?: boolean
    progressive?: boolean
    preserveMetadata?: boolean
  }
): Promise<ConversionResult>
```

**Parameters:**
- `input`: Path to the image file or a Buffer containing the image data
- `options`: Configuration options
  - `format`: Output format (required)
  - `output`: Output file path
  - `quality`: Output quality, 1-100
  - `lossless`: Whether to use lossless compression (for WebP/AVIF)
  - `progressive`: Enable progressive mode if format supports it
  - `preserveMetadata`: Whether to preserve image metadata

**Returns:** Promise resolving to `ConversionResult` with properties:
- `inputPath`: Path to input file
- `outputPath`: Path to output file
- `format`: Output format
- `width`: Width of output image
- `height`: Height of output image
- `originalSize`: Size of input file in bytes
- `convertedSize`: Size of output file in bytes
- `saved`: Bytes saved
- `savedPercentage`: Percentage of size reduction

**Example:**
```ts
import { convert } from '@stacksjs/imgx'

const result = await convert('path/to/image.jpg', {
  format: 'webp',
  quality: 85,
  output: 'path/to/output.webp',
})

console.log(`Converted to ${result.format} with ${result.savedPercentage.toFixed(2)}% reduction`)
```

## Responsive Images

### `generateResponsive`

Generates responsive image sets in multiple sizes and formats.

```ts
async function generateResponsive(
  input: string,
  options?: {
    sizes?: number[]
    formats?: Array<'webp' | 'avif' | 'jpeg' | 'png'>
    quality?: number
    outputDir?: string
    filenameTemplate?: string
    generateSrcset?: boolean
  }
): Promise<Array<ResponsiveImageResult>>
```

**Parameters:**
- `input`: Path to the image file
- `options`: Optional configuration options
  - `sizes`: Array of widths to generate
  - `formats`: Array of formats to generate for each size
  - `quality`: Output quality, 1-100
  - `outputDir`: Directory for output files
  - `filenameTemplate`: Template for output filenames
  - `generateSrcset`: Whether to include srcset HTML in result

**Returns:** Promise resolving to an array of `ResponsiveImageResult` objects

**Example:**
```ts
import { generateResponsive } from '@stacksjs/imgx'

const images = await generateResponsive('path/to/image.jpg', {
  sizes: [320, 640, 960, 1280, 1920],
  formats: ['webp', 'jpeg'],
  outputDir: './public/images',
})

console.log(`Generated ${images.length} responsive images`)
```

## App Icons

### `createAppIcon`

Generates app icons for various platforms.

```ts
async function createAppIcon(
  input: string,
  options?: {
    platform?: 'macos' | 'ios' | 'all'
    outputDir?: string
  }
): Promise<AppIconResult>
```

**Parameters:**
- `input`: Path to the source image (should be high resolution, ideally 1024x1024 or larger)
- `options`: Optional configuration options
  - `platform`: Target platform ('macos', 'ios', or 'all')
  - `outputDir`: Directory for output files

**Returns:** Promise resolving to `AppIconResult` with properties about the generated icons

**Example:**
```ts
import { createAppIcon } from '@stacksjs/imgx'

const icons = await createAppIcon('path/to/icon.png', {
  platform: 'ios',
  outputDir: './public/app-icons',
})

console.log(`Generated ${icons.sizes.length} icon sizes for ${icons.platform}`)
```

## Placeholders

### `createPlaceholder`

Generates low-quality image placeholders using various strategies.

```ts
async function createPlaceholder(
  input: string,
  options?: {
    width?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
    blurLevel?: number
    base64Encode?: boolean
    strategy?: 'blur' | 'pixelate' | 'thumbhash' | 'dominant-color'
    outputPath?: string
  }
): Promise<PlaceholderResult>
```

**Parameters:**
- `input`: Path to the image file
- `options`: Optional configuration options
  - `width`: Width of the placeholder image
  - `quality`: Output quality, 1-100
  - `format`: Output format
  - `blurLevel`: Blur strength (for 'blur' strategy)
  - `base64Encode`: Whether to return a base64-encoded data URL
  - `strategy`: Placeholder generation strategy
  - `outputPath`: Path to save the placeholder image

**Returns:** Promise resolving to `PlaceholderResult` with placeholder data

**Example:**
```ts
import { createPlaceholder } from '@stacksjs/imgx'

const placeholder = await createPlaceholder('path/to/image.jpg', {
  strategy: 'thumbhash',
  base64Encode: true,
})

console.log(`Generated placeholder: ${placeholder.dataURL}`)
```

## SVG Processing

### `optimizeSvg`

Optimizes SVG files by removing unnecessary information.

```ts
async function optimizeSvg(
  input: string | Buffer,
  options?: {
    output?: string
    prettify?: boolean
    removeComments?: boolean
    removeDimensions?: boolean
    removeViewBox?: boolean
    // ... other SVG optimization options
  }
): Promise<SvgOptimizeResult>
```

**Parameters:**
- `input`: Path to the SVG file or a Buffer containing the SVG data
- `options`: Optional SVG optimization options

**Returns:** Promise resolving to `SvgOptimizeResult` with optimization results

**Example:**
```ts
import { optimizeSvg } from '@stacksjs/imgx'

const result = await optimizeSvg('path/to/icon.svg', {
  removeComments: true,
  prettify: false,
})

console.log(`Optimized SVG: saved ${result.savedPercentage.toFixed(2)}%`)
```

## Batch Processing

### `batchProcess`

Processes multiple images at once with the same settings.

```ts
async function batchProcess(
  inputPattern: string | string[],
  options?: BatchProcessingOptions
): Promise<BatchProcessingResult>
```

**Parameters:**
- `inputPattern`: Glob pattern string or array of file paths
- `options`: Optional batch processing options

**Returns:** Promise resolving to `BatchProcessingResult` with batch processing results

**Example:**
```ts
import { batchProcess } from '@stacksjs/imgx'

const result = await batchProcess('./images/**/*.{jpg,png}', {
  formats: ['webp'],
  quality: 80,
  outputDir: './public/images',
})

console.log(`Processed ${result.summary.totalFiles} files, saved ${result.summary.saved} bytes total`)
```
