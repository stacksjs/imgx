# Configuration

imgx can be configured using an `imgx.config.ts` _(or `imgx.config.js`)_ file and it will be automatically loaded when running the `imgx` command.

```ts
// imgx.config.{ts,js}
import type { ImgxConfig } from '@stacksjs/imgx'

const config: ImgxConfig = {
  /**

   _ Enable verbose logging
   _ Default: true

   */
  verbose: true,

  /**

   _ Enable caching of processed images
   _ Default: true

   */
  cache: true,

  /**

   _ Directory to store cached images
   _ Default: '.imgx-cache'

   */
  cacheDir: '.imgx-cache',

  /**

   _ Number of concurrent processing operations
   _ Default: 4

   */
  concurrent: 4,

  /**

   _ Skip already optimized images
   _ Default: false

   */
  skipOptimized: false,

  /**

   _ Default quality setting for images
   _ Default: 80

   */
  quality: 80,

  /**

   _ Default output format
   _ Default: 'webp'

   */
  format: 'webp',

  /**

   _ Enable progressive image loading
   _ Default: true

   */
  progressive: true,

  /**

   _ Preserve image metadata
   _ Default: false

   */
  preserveMetadata: false,

  /**

   _ App icon generation settings

   _/
  appIcon: {
    outputDir: 'assets/app-icons',
    platform: 'all', // 'macos', 'ios', or 'all'
  },

  /**

   _ Responsive image generation settings

   _/
  responsive: {
    sizes: [320, 640, 960, 1280, 1920],
    formats: ['webp', 'jpeg'],
    quality: 80,
    generateSrcset: true,
    filenameTemplate: '[name]-[width].[ext]',
  },

  /**

   _ Placeholder generation settings

   _/
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

   _ SVG optimization settings

   _/
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
