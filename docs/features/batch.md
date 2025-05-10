# Batch Processing

imgx provides powerful batch processing capabilities for optimizing, converting, and transforming multiple images at once, saving time and ensuring consistent results across your entire image library.

## Benefits of Batch Processing

- **Efficiency**: Process hundreds or thousands _(or more)_ of images with a single command
- **Consistency**: Apply the same settings to all images
- **Automation**: Easily integrate into build processes and automation workflows
- **Flexibility**: Filter and target specific file types or directories

## Basic Usage

### CLI

```bash
# Process all images in a directory
imgx batch ./images

# Process images and specify output directory
imgx batch ./images --output-dir ./optimized

# Process images recursively (including subdirectories)
imgx batch ./images --recursive

# Convert all images to WebP format
imgx batch ./images --formats webp
```

### JavaScript/TypeScript API

```ts
import { batchProcess } from '@stacksjs/imgx'

// Basic batch processing
const result = await batchProcess('./images/**/*.{jpg,png}')

// With options
const resultWithOptions = await batchProcess('./images', {
  formats: ['webp', 'avif'],
  quality: 80,
  outputDir: './optimized',
  recursive: true,
})

console.log(`Processed ${result.summary.totalFiles} files`)
console.log(`Total saved: ${result.summary.saved} bytes (${result.summary.savedPercentage.toFixed(2)}%)`)
```

## Processing Options

imgx provides many options for batch processing:

### Output Options

```ts
await batchProcess('./images', {
  // Output directory for processed images
  outputDir: './optimized',

  // Preserve directory structure in output
  preserveStructure: true,

  // Template for output filenames
  filenameTemplate: '[name]-optimized.[format]',
})
```

### Format Options

```ts
await batchProcess('./images', {
  // Convert to specific formats
  formats: ['webp', 'avif'],

  // Format-specific quality settings
  quality: {
    webp: 80,
    avif: 65,
    jpeg: 85,
  },
})
```

### Filter Options

```ts
await batchProcess('./images', {
  // Process subdirectories recursively
  recursive: true,

  // Filter files using regex pattern
  filter: '\.(jpe?g|png)$',

  // Skip existing output files
  skipExisting: true,
})
```

### Transformation Options

```ts
await batchProcess('./images', {
  // Resize all images
  resize: {
    width: 1200,
    height: 800,
    fit: 'inside', // 'cover', 'contain', 'inside', 'outside', 'fill'
  },

  // Apply transformations to each image
  transformations: [
    { type: 'resize', options: { width: 1200 } },
    { type: 'grayscale' },
    { type: 'sharpen', options: { sigma: 1 } },
  ],
})
```

## Common Batch Processing Tasks

### Convert to Modern Formats

Convert all images to modern formats for better web performance:

```bash
imgx batch ./images --formats webp,avif --quality.webp 80 --quality.avif 65
```

```ts
await batchProcess('./images', {
  formats: ['webp', 'avif'],
  quality: {
    webp: 80,
    avif: 65,
  },
  outputDir: './optimized',
})
```

### Create Responsive Image Sets

Generate multiple sizes of each image:

```bash
imgx batch ./images --responsive --sizes 320,640,960,1280,1920
```

```ts
await batchProcess('./images', {
  responsive: {
    sizes: [320, 640, 960, 1280, 1920],
    formats: ['webp', 'jpeg'],
  },
  outputDir: './responsive',
})
```

### Optimize for Web

Optimize all images for web use without changing format:

```bash
imgx batch ./images --optimization-preset web
```

```ts
await batchProcess('./images', {
  optimizationPreset: 'web',
  preserveStructure: true,
})
```

## Filtering and Targeting

### Using Glob Patterns

You can use glob patterns to target specific files:

```bash
# Process all JPGs and PNGs
imgx batch "./images/**/*.{jpg,png}"

# Process only certain subdirectories
imgx batch "./images/{products,backgrounds}/**/*"
```

### Using Regex Filters

Filter files using regex patterns:

```bash
# Process only product images
imgx batch ./images --filter "product-[0-9]+\.(jpg|png)"
```

```ts
await batchProcess('./images', {
  filter: 'product-[0-9]+\\.(jpg|png)',
})
```

## Progress and Reporting

Track progress during batch operations:

```ts
await batchProcess('./images', {
  progressCallback: (progress) => {
    console.log(`Processed: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(2)}%)`)
    console.log(`Current file: ${progress.currentFile}`)
  },
})
```

Get detailed results and summaries:

```ts
const result = await batchProcess('./images')

console.log(`
Summary:
- Total files: ${result.summary.totalFiles}
- Success: ${result.summary.successCount}
- Errors: ${result.summary.errorCount}
- Original size: ${formatBytes(result.summary.originalSize)}
- Optimized size: ${formatBytes(result.summary.optimizedSize)}
- Saved: ${formatBytes(result.summary.saved)} (${result.summary.savedPercentage.toFixed(2)}%)
- Time: ${result.summary.timeElapsed}ms
`)

// Function to format bytes to readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0)
    return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}
```

## Concurrency Control

Control how many images are processed simultaneously:

```bash
imgx batch ./images --concurrency 8
```

```ts
await batchProcess('./images', {
  concurrency: 8, // Process 8 images at a time
})
```

## Error Handling

Handle errors during batch processing:

```ts
try {
  const result = await batchProcess('./images')

  // Check for errors
  if (result.summary.errorCount > 0) {
    console.log(`Completed with ${result.summary.errorCount} errors:`)

    result.results
      .filter(r => !r.success)
      .forEach((r) => {
        console.error(`Error processing ${r.input}: ${r.error}`)
      })
  }
}
catch (error) {
  console.error('Batch processing failed:', error)
}
```

## Integration with Build Tools

### Using with npm Scripts

```json
{
  "scripts": {
    "optimize-images": "imgx batch ./src/assets/images --formats webp --output-dir ./public/images"
  }
}
```

### Using with CI/CD Pipelines

```yaml
# Example GitHub Actions workflow
optimize-images:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 16
    - run: npm ci
    - run: npm install -g @stacksjs/imgx
    - run: imgx batch ./src/assets/images --formats webp,avif --output-dir ./public/images
```

## Configuration

You can set default batch processing options in your imgx.config.ts file:

```ts
// imgx.config.ts
export default {
  batch: {
    formats: ['webp'],
    quality: 80,
    recursive: false,
    filter: '\.(jpe?g|png|gif|bmp|tiff?)$',
    skipExisting: true,
    concurrency: 4,
    preserveStructure: true,
    filenameTemplate: '[name].[format]',
    preserveMetadata: false,
    optimizationPreset: 'web',
  },
}
```
