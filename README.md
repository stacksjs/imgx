<p align="center"><img src="https://github.com/stacksjs/imgx/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# imgx

> A powerful image optimization toolkit for modern web development.

## Features

- **Advanced Image Optimization**
  - Lossy & lossless compression
  - Smart quality optimization
  - Metadata stripping
  - Color profile management

- **Format Support**
  - WebP, AVIF conversion
  - JPEG, PNG optimization
  - SVG minification
  - Animated GIF optimization

- **Modern Web Features**
  - Responsive image generation
  - Art direction support
  - Lazy loading helpers
  - ThumbHash placeholders
  - Sprite sheet generation
  - OG Image generation

- **Developer Experience**
  - Watch mode for development
  - Development server with on-the-fly optimization
  - CI/CD integration
  - Detailed analysis and reporting
  - Progress indicators

- **Privacy & Performance**
  - Metadata stripping
  - Configurable optimization levels
  - Cache control
  - Web-optimized by default

## Install

```bash
bun install -d @stacksjs/imgx
```

## Get Started

### CLI Usage

Basic optimization:

```bash
# Optimize a single image
imgx optimize input.jpg -q 75

# Convert to WebP
imgx optimize input.jpg output.webp -f webp

# Optimize a directory of images
imgx optimize ./images -R -f webp

# Watch mode for development
imgx optimize ./src/images -w -f webp
```

Advanced features:

```bash
# Generate responsive images
imgx optimize hero.jpg --responsive --responsive-sizes 320,768,1024,1920

# Create sprite sheet
imgx sprite ./icons ./dist --retina --optimize

# Generate thumbnails with ThumbHash
imgx optimize input.jpg -t --thumbhash-size 64x64

# Analyze image optimization potential
imgx analyze ./images -o report.json --ci
```

Development server:

```bash
# Start dev server with on-the-fly optimization
imgx serve ./public -p 3000

# Access optimized images:
# http://localhost:3000/image.jpg?format=webp&quality=75&size=800x600
```

### Library Usage

```ts
import { analyzeImage, generateSprite, process } from '@stacksjs/imgx'

// Basic optimization
await process({
  input: 'input.jpg',
  output: 'output.webp',
  quality: 75,
  format: 'webp'
})

// Generate responsive images
await process({
  input: 'hero.jpg',
  responsive: true,
  responsiveSizes: [320, 768, 1024, 1920],
  format: 'webp'
})

// Create sprite sheet
await generateSprite({
  images: ['icon1.png', 'icon2.png'],
  output: './dist',
  retina: true,
  format: 'webp'
})

// Analyze images
const report = await analyzeImage('image.jpg')
console.log(report.optimizationPotential)
```

## Configuration

Create an `imgx.config.ts` file:

```ts
import type { ImgxConfig } from '@stacksjs/imgx'

export default {
  // General options
  verbose: true,
  cache: true,
  cacheDir: '.imgx-cache',

  // Default optimization settings
  quality: 75,
  format: 'webp',
  progressive: true,
  stripMetadata: true,

  // Responsive image settings
  responsive: {
    sizes: [320, 768, 1024, 1920],
    formats: ['webp', 'avif'],
    quality: 75
  },

  // Sprite generation
  sprites: {
    retina: true,
    padding: 2,
    prefix: 'icon',
    format: 'webp'
  },

  // Development server
  server: {
    port: 3000,
    cache: true,
    cors: true
  }
} satisfies ImgxConfig
```

## CLI Reference

```bash
imgx optimize [input] [output]

Options:
  -q, --quality <number>     Image quality (1-100) (default: 80)
  -r, --resize <string>      Resize image (e.g., "50%" or "800x600")
  -f, --format <string>      Output format (jpeg, png, webp, avif)
  -p, --progressive         Enable progressive mode (default: true)
  -m, --preserve-metadata   Preserve image metadata
  -w, --watch              Watch for file changes
  -R, --recursive          Process directories recursively
  -t, --thumbhash          Generate ThumbHash placeholder
  --responsive             Generate responsive images
  --skip-existing         Skip already optimized files
  --backup                Create backup of original files

Examples:
  $ imgx optimize input.jpg -q 75 -r 50%
  $ imgx optimize ./images -f webp -R
  $ imgx optimize input.jpg -t --thumbhash-size 64x64
  $ imgx sprite ./icons ./dist --retina --optimize
  $ imgx analyze ./images --ci --threshold 500KB
```

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/stacks/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

"Software that is free, but hopes for a postcard." We love receiving postcards from around the world showing where `imgx` is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## Credits

- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

## App Icon Generation

You can now use imgx to generate properly sized app icons for macOS and iOS applications from a single source image.

### Command Line Usage

```bash
# Generate app icons for all platforms (macOS and iOS)
imgx app-icon source-icon.png

# Generate only macOS app icons
imgx app-icon source-icon.png -p macos

# Generate only iOS app icons
imgx app-icon source-icon.png -p ios

# Specify a custom output directory
imgx app-icon source-icon.png -o ./my-app/assets
```

### Programmatic Usage

```typescript
import { generateAppIcons } from 'imgx'

// Generate app icons for all platforms
await generateAppIcons('path/to/source-icon.png')

// Generate only macOS app icons
await generateAppIcons('path/to/source-icon.png', {
  platform: 'macos',
  outputDir: './my-app/assets'
})
```

### Configuration

You can configure the app icon generation in your `imgx.config.ts` file:

```typescript
import type { ImgxConfig } from 'imgx'

const config: ImgxConfig = {
  // Other configuration options...

  appIcon: {
    outputDir: 'assets/app-icons', // Default output directory
    platform: 'all', // Default platform target ('macos', 'ios', or 'all')
  },
}

export default config
```

### Output

The tool will generate:

1. All required app icon sizes for the selected platform(s)
2. A properly formatted `Contents.json` file for Xcode
3. A README.md with installation instructions

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@stacksjs/imgx?style=flat-square
[npm-version-href]: https://npmjs.com/package/@stacksjs/imgx
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/imgx/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/imgx/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/imgx/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/imgx -->
