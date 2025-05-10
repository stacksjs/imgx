# Configuration

imgx can be configured using an `imgx.config.ts` _(or `imgx.config.js`)_ file and it will be automatically loaded when running the `imgx` command.

```ts
// imgx.config.{ts,js}
import type { ImgxConfig } from '@stacksjs/imgx'

const config: ImgxConfig = {
  /**
   * Enable verbose logging
   * Default: true
   */
  verbose: true,

  /**
   * Enable caching of processed images
   * Default: true
   */
  cache: true,

  /**
   * Directory to store cached images
   * Default: '.imgx-cache'
   */
  cacheDir: '.imgx-cache',

  /**
   * Number of concurrent processing operations
   * Default: 4
   */
  concurrent: 4,

  /**
   * Skip already optimized images
   * Default: false
   */
  skipOptimized: false,

  /**
   * Default quality setting for images
   * Default: 80
   */
  quality: 80,

  /**
   * Default output format
   * Default: 'webp'
   */
  format: 'webp',

  /**
   * Enable progressive image loading
   * Default: true
   */
  progressive: true,

  /**
   * Preserve image metadata
   * Default: false
   */
  preserveMetadata: false,

  /**
   * App icon generation settings
   */
  appIcon: {
    outputDir: 'assets/app-icons',
    platform: 'all', // 'macos', 'ios', or 'all'
  },

  /**
   * Responsive image generation settings
   */
  responsive: {
    sizes: [320, 640, 960, 1280, 1920],
    formats: ['webp', 'jpeg'],
    quality: 80,
    generateSrcset: true,
    filenameTemplate: '[name]-[width].[ext]',
  },

  /**
   * Placeholder generation settings
   */
  placeholders: {
    width: 20,
    quality: 50,
    format: 'webp',
    blurLevel: 40,
    base64Encode: true,
    useThumbhash: false,
    strategy: 'blur', // 'blur', 'pixelate', 'thumbhash', 'dominant-color'
  },

  /**
   * SVG optimization settings
   */
  svg: {
    prettify: false,
    removeComments: true,
    removeDimensions: true,
    removeViewBox: false,
  }
}

export default config
```

_Then run:_

```bash
imgx <command>
```

For a complete list of all configuration options, see the [Configuration API Reference](/api/configuration).
