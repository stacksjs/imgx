# Usage

There are two ways of using imgx: _as a library or as a CLI._

## CLI

The simplest way to use imgx is through its CLI:

```bash
# Optimize a single image
imgx optimize path/to/image.jpg

# Convert to WebP format
imgx convert path/to/image.jpg --format webp

# Generate responsive images
imgx responsive path/to/image.jpg --sizes 320,640,960,1280

# Create app icons
imgx app-icon path/to/icon.png --platform ios

# Generate placeholders
imgx placeholder path/to/image.jpg --strategy thumbhash

# Optimize SVGs
imgx svg path/to/icon.svg

# Batch process all images in a directory
imgx batch ./images --formats webp,avif --quality 80

# Watch a directory for changes and process automatically
imgx watch ./src/assets --formats webp
```

For more CLI options:

```bash
imgx --help
imgx <command> --help
```

## Library

imgx can also be used as a library in your JavaScript/TypeScript projects:

```ts
import {
  convert,
  createAppIcon,
  createPlaceholder,
  generateResponsive,
  optimize
} from '@stacksjs/imgx'

// Optimize an image
const result = await optimize('path/to/image.jpg', {
  quality: 80,
  format: 'webp',
})
console.log(`Reduced file size by ${result.savedPercentage.toFixed(2)}%`)

// Convert image format
await convert('path/to/image.jpg', {
  format: 'webp',
  quality: 85,
  output: 'path/to/output.webp'
})

// Generate responsive image set
const responsiveImages = await generateResponsive('path/to/image.jpg', {
  sizes: [320, 640, 960, 1280, 1920],
  formats: ['webp', 'jpeg'],
  outputDir: './public/images',
})

// Generate app icons
const appIcons = await createAppIcon('path/to/icon.png', {
  platform: 'ios',
  outputDir: './public/app-icons',
})

// Create image placeholder
const placeholder = await createPlaceholder('path/to/image.jpg', {
  strategy: 'thumbhash',
  base64Encode: true,
})
console.log(`Placeholder data URL: ${placeholder.dataURL}`)
```

## Using with Vite

imgx provides a Vite plugin for automatic image optimization during build:

```ts
import { viteImgxPlugin } from '@stacksjs/vite-plugin'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    viteImgxPlugin({
      quality: 80,
      formats: ['webp'],
      include: ['**/*.{jpg,jpeg,png}'],
      exclude: ['node_modules/**'],
    }),
  ],
})
```

## Using with Bun

imgx can also be used with Bun:

```ts
// bunfig.ts
import { bunImgxPlugin } from '@stacksjs/bun-plugin'

export default {
  plugins: [
    bunImgxPlugin({
      quality: 80,
      formats: ['webp'],
      include: ['**/*.{jpg,jpeg,png}'],
      exclude: ['node_modules/**'],
    }),
  ],
}
```

## Testing

```bash
bun test
```
