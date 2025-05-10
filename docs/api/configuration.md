# Configuration API Reference

This page documents the complete configuration options available in imgx. The configuration can be defined in an `imgx.config.ts` or `imgx.config.js` file in your project root.

## Configuration Structure

The imgx configuration object follows this structure:

```ts
interface ImgxConfig {
  // Core settings
  verbose: boolean | string[]
  cache: boolean
  cacheDir: string
  concurrent: number
  skipOptimized: boolean

  // Default image processing settings
  quality?: number
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  progressive?: boolean
  preserveMetadata?: boolean

  // Feature-specific configurations
  appIcon?: AppIconConfig
  responsive?: ResponsiveConfig
  sprites?: SpritesConfig
  placeholders?: PlaceholdersConfig
  batch?: BatchConfig
  optimization?: OptimizationConfig
  conversion?: ConversionConfig
  social?: SocialConfig
  transformations?: TransformationsConfig
  watermark?: WatermarkConfig
  svg?: SvgConfig
}
```

## Core Settings

These settings control the general behavior of imgx:

```ts
{
  // Enable verbose logging
  // Can be boolean or array of specific modules to log
  verbose: true,

  // Enable caching of processed images
  cache: true,

  // Directory to store cached images
  cacheDir: '.imgx-cache',

  // Number of concurrent processing operations
  concurrent: 4,

  // Skip already optimized images
  skipOptimized: false,
}
```

## Default Image Processing Settings

These settings apply to all image processing operations unless overridden:

```ts
{
  // Default quality setting (1-100)
  quality: 80,

  // Default output format
  format: 'webp',

  // Enable progressive mode if format supports it
  progressive: true,

  // Preserve image metadata (EXIF, etc.)
  preserveMetadata: false,
}
```

## Feature-Specific Configurations

### App Icon Generation

```ts
{
  appIcon: {
    // Output directory for generated app icons
    outputDir: 'assets/app-icons',

    // Target platform (macos, ios, or all)
    platform: 'all',
  }
}
```

### Responsive Images

```ts
{
  responsive: {
    // Array of widths to generate
    sizes: [320, 640, 960, 1280, 1920],

    // Array of formats to generate for each size
    formats: ['webp', 'jpeg'],

    // Quality setting (1-100)
    quality: 80,

    // Generate srcset attributes for HTML
    generateSrcset: true,

    // Template for output filenames
    filenameTemplate: '[name]-[width].[ext]',
  }
}
```

### Sprite Sheets

```ts
{
  sprites: {
    // Padding between sprites in pixels
    padding: 2,

    // Maximum width of sprite sheet
    maxWidth: 2048,

    // Prefix for generated CSS classes
    prefix: 'sprite',

    // Output format
    format: 'png',

    // Quality setting (1-100)
    quality: 90,

    // Scale factor
    scale: 1,
  }
}
```

### Placeholders

```ts
{
  placeholders: {
    // Width of generated placeholder in pixels
    width: 20,

    // Quality setting (1-100)
    quality: 50,

    // Output format
    format: 'webp',

    // Blur strength (for blur strategy)
    blurLevel: 40,

    // Output as base64-encoded data URL
    base64Encode: true,

    // Use ThumbHash algorithm instead of blurring
    useThumbhash: false,

    // Placeholder generation strategy
    strategy: 'blur', // 'blur', 'pixelate', 'thumbhash', 'dominant-color'

    // Saturation adjustment for dominant-color strategy
    saturation: 1.2,

    // Generate CSS filter property
    cssFilter: false,
  }
}
```

### Batch Processing

```ts
{
  batch: {
    // Array of formats to convert to
    formats: ['webp'],

    // Quality setting (1-100) or format-specific settings
    quality: 80, // or { webp: 80, avif: 70, jpeg: 85 }

    // Resize options
    resize: { width: 1200, height: 800 },

    // Process subdirectories recursively
    recursive: false,

    // Regex pattern string to filter files
    filter: '\.(jpe?g|png|gif|bmp|tiff?)$',

    // Skip existing output files
    skipExisting: true,

    // Number of files to process concurrently
    concurrency: 4,

    // Preserve directory structure in output
    preserveStructure: true,

    // Template for output filenames
    filenameTemplate: '[name].[format]',

    // Preserve image metadata
    preserveMetadata: false,

    // Optimization preset
    optimizationPreset: 'web', // 'web', 'quality', 'performance'
  }
}
```

### Image Optimization

```ts
{
  optimization: {
    // Global settings
    quality: 80,
    lossless: false,
    progressive: true,
    effort: 7, // Compression effort (1-10)
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
      palette: true, // Convert to palette-based PNG if possible
      adaptiveFiltering: true,
    },
    webp: {
      quality: 80,
      lossless: false,
      effort: 6,
      smartSubsample: true, // Reduce chroma subsampling in detailed areas
    },
    avif: {
      quality: 70,
      lossless: false,
      effort: 7,
    },
  }
}
```

### Format Conversion

```ts
{
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
  }
}
```

### Social Image Generation

```ts
{
  social: {
    quality: 85,
    customSizes: {
      'og-github': { width: 1280, height: 640 },
      'og-facebook': { width: 1200, height: 630 },
      'og-twitter': { width: 1200, height: 600 },
      'og-linkedin': { width: 1104, height: 736 },
      'og-instagram': { width: 1080, height: 1080 },
    },
  }
}
```

### Image Transformations

```ts
{
  transformations: {
    // Default transformation chains that can be referred to by name
    presets: {
      webOptimized: [
        { type: 'resize', options: { width: 1200, withoutEnlargement: true } },
      ],
      thumbnail: [
        { type: 'resize', options: { width: 300, height: 300, fit: 'inside' } },
      ],
      grayscale: [
        { type: 'grayscale' },
      ],
      sharpen: [
        { type: 'sharpen', options: { sigma: 1 } },
      ],
    },
  }
}
```

### Watermarking

```ts
{
  watermark: {
    // Default text for watermarks (if not specified)
    defaultText: '© 2023 My Company',

    // Default image for watermarks (if not specified)
    defaultImage: 'path/to/watermark.png',

    // Position of the watermark
    position: 'bottom-right', // 'center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'

    // Opacity of the watermark (0-1)
    opacity: 0.5,

    // Margin from the edge (in pixels)
    margin: 20,

    // Scale factor for image watermarks
    scale: 0.2,

    // Text watermark options
    textOptions: {
      font: 'sans-serif',
      fontSize: 24,
      color: 'rgba(255, 255, 255, 0.7)',
      background: 'rgba(0, 0, 0, 0.3)',
      padding: 10,
    },
  }
}
```

### SVG Optimization

```ts
{
  svg: {
    // Format SVG code (less compression but more readable)
    prettify: false,

    // Floating point precision
    precision: 3,

    // Apply multiple optimization passes
    multipass: true,

    // Remove comments
    removeComments: true,

    // Remove metadata
    removeMetadata: true,

    // Remove viewBox attribute
    removeViewBox: false,

    // Remove width/height attributes
    removeDimensions: true,

    // Remove hidden elements
    removeHiddenElements: true,

    // Remove empty attributes
    removeEmptyAttrs: true,

    // Remove empty containers
    removeEmptyContainers: true,

    // Remove unused namespaces
    removeUnusedNS: true,

    // Clean up IDs
    cleanupIDs: true,

    // Clean up numeric values
    cleanupNumericValues: true,

    // Clean up list of values
    cleanupListOfValues: true,

    // Collapse groups
    collapseGroups: true,

    // Convert colors to hex/rgba
    convertColors: true,

    // Optimize path data
    convertPathData: true,

    // Convert shapes to paths
    convertShapeToPath: true,

    // Convert style attributes to attributes
    convertStyleToAttrs: true,

    // Optimize transformations
    convertTransform: true,

    // Inline styles
    inlineStyles: true,

    // Minify styles
    minifyStyles: true,

    // Merge paths
    mergePaths: true,

    // Add prefix to IDs
    prefixIds: false, // or string prefix

    // Add prefix to class names
    prefixClassNames: false, // or string prefix

    // Remove xmlns attribute
    removeXMLNS: false,

    // Remove elements that are positioned off-canvas
    removeOffCanvasPaths: true,

    // Reuse identical paths
    reusePaths: true,

    // Sort attribute values
    sortAttrs: true,

    // Sort children of <defs>
    sortDefsChildren: true,

    // Remove DOCTYPE
    removeDoctype: true,

    // Remove XML processing instructions
    removeXMLProcInst: true,

    // Remove <title>
    removeTitle: false,

    // Remove <desc>
    removeDesc: false,

    // Remove <script>
    removeScriptElement: true,

    // Remove <style>
    removeStyleElement: false,
  }
}
```

## Complete Example Configuration

Here's a complete example of an imgx configuration file:

```ts
// imgx.config.ts
import type { ImgxConfig } from '@stacksjs/imgx'

const config: ImgxConfig = {
  // Core settings
  verbose: true,
  cache: true,
  cacheDir: '.imgx-cache',
  concurrent: 4,
  skipOptimized: false,

  // Default settings
  quality: 80,
  format: 'webp',
  progressive: true,
  preserveMetadata: false,

  // App icon generation
  appIcon: {
    outputDir: 'assets/app-icons',
    platform: 'all',
  },

  // Responsive images
  responsive: {
    sizes: [320, 640, 960, 1280, 1920],
    formats: ['webp', 'jpeg'],
    quality: 80,
    generateSrcset: true,
    filenameTemplate: '[name]-[width].[ext]',
  },

  // Placeholder images
  placeholders: {
    width: 20,
    quality: 50,
    format: 'webp',
    blurLevel: 40,
    base64Encode: true,
    useThumbhash: true,
    strategy: 'thumbhash',
  },

  // Format-specific optimization settings
  optimization: {
    jpeg: {
      quality: 85,
      progressive: true,
      mozjpeg: true,
    },
    webp: {
      quality: 80,
      lossless: false,
      effort: 6,
    },
    avif: {
      quality: 70,
      lossless: false,
      effort: 7,
    },
  },

  // SVG optimization
  svg: {
    removeComments: true,
    removeDimensions: true,
    removeViewBox: false,
    cleanupIDs: true,
  },
}

export default config
```

## Environment-specific Configuration

You can create environment-specific configuration by using environment variables or conditions:

```ts
// imgx.config.ts
import type { ImgxConfig } from '@stacksjs/imgx'

const isDev = process.env.NODE_ENV === 'development'

const config: ImgxConfig = {
  // Core settings
  verbose: isDev,
  cache: !isDev,

  // Development settings override production quality for faster processing
  quality: isDev ? 60 : 80,

  // Use different optimization settings in production
  optimization: {
    jpeg: {
      quality: isDev ? 70 : 85,
      progressive: !isDev, // Only enable progressive in production
    },
  },
}

export default config
```

## Configuration Loading

imgx automatically looks for a configuration file in the following order:
1. `imgx.config.ts` in the current directory
2. `imgx.config.js` in the current directory
3. `imgx` property in `package.json`

You can also specify a custom configuration file path using the `--config` CLI option:

```bash
imgx optimize image.jpg --config ./custom-config.js
```
