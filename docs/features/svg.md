# SVG Optimization

imgx provides powerful tools for optimizing and transforming SVG files, helping you reduce file sizes while maintaining quality and functionality.

## Why Optimize SVGs?

SVG files often contain unnecessary information that increases file size without adding visual value:

- **Reduce File Size**: Remove unnecessary metadata, comments, and attributes
- **Improve Performance**: Smaller files load faster, especially when used inline
- **Simplify Markup**: Clean up SVGs from design tools which often create bloated markup
- **Enhance Developer Experience**: Make SVGs easier to work with and understand

## Basic Usage

### CLI

```bash
# Optimize a single SVG file
imgx svg icon.svg

# Optimize and specify output path
imgx svg icon.svg --output optimized/icon.svg

# Optimize multiple SVGs using glob pattern
imgx svg "icons/*.svg" --output-dir optimized/

# Prettify SVG (for readability)
imgx svg icon.svg --prettify
```

### JavaScript/TypeScript API

```ts
import { optimizeSvg } from '@stacksjs/imgx'

// Basic optimization
const result = await optimizeSvg('path/to/icon.svg')

// With options
const resultWithOptions = await optimizeSvg('path/to/icon.svg', {
  output: 'path/to/optimized.svg',
  removeComments: true,
  removeDimensions: true,
  prettify: false,
})

console.log(`Original size: ${result.inputSize} bytes`)
console.log(`Optimized size: ${result.outputSize} bytes`)
console.log(`Saved: ${result.saved} bytes (${result.savedPercentage.toFixed(2)}%)`)
```

## Optimization Options

imgx provides many options for SVG optimization:

### Basic Options

```ts
await optimizeSvg('icon.svg', {
  // Format SVG for readability (less compression, easier to edit)
  prettify: false,

  // Remove comments
  removeComments: true,

  // Remove metadata
  removeMetadata: true,

  // Remove width/height attributes (useful for responsive SVGs)
  removeDimensions: true,

  // Keep viewBox attribute (important for scaling)
  removeViewBox: false,
})
```

### Advanced Options

```ts
await optimizeSvg('icon.svg', {
  // Precision of floating point numbers
  precision: 3,

  // Apply multiple optimization passes
  multipass: true,

  // Clean up IDs
  cleanupIDs: true,

  // Convert colors to hex/rgba
  convertColors: true,

  // Optimize path data
  convertPathData: true,

  // Merge similar paths
  mergePaths: true,

  // Add prefix to IDs (prevents conflicts when using multiple SVGs)
  prefixIds: 'icon-',
})
```

## Common Optimization Tasks

### Responsive SVGs

For responsive SVGs, remove fixed dimensions while preserving the viewBox:

```bash
imgx svg icon.svg --remove-dimensions --preserve-viewbox
```

```ts
await optimizeSvg('icon.svg', {
  removeDimensions: true,
  removeViewBox: false,
})
```

### Icon Optimization

For UI icons, apply aggressive optimization:

```bash
imgx svg icon.svg --preset "icon"
```

```ts
await optimizeSvg('icon.svg', {
  // Preset applied automatically sets appropriate options for icons
  preset: 'icon',
})
```

### Accessibility

Preserve title and description elements for accessibility:

```bash
imgx svg icon.svg --preserve-title --preserve-desc
```

```ts
await optimizeSvg('icon.svg', {
  removeTitle: false,
  removeDesc: false,
})
```

## SVG Sprite Generation

imgx can also combine multiple SVGs into a single sprite sheet:

```bash
imgx sprite "icons/*.svg" --output sprites.svg --prefix "icon-"
```

```ts
import { createSpriteSheet } from '@stacksjs/imgx'

const result = await createSpriteSheet(['icon1.svg', 'icon2.svg', 'icon3.svg'], {
  output: 'sprites.svg',
  prefix: 'icon-', // Prefix for IDs
  optimize: true, // Optimize individual SVGs before combining
})

console.log(`Generated sprite with ${result.count} icons`)
```

### Using SVG Sprites

Using the generated sprite sheet in HTML:

```html
<!-- In your HTML document -->
<svg>
  <use href="sprites.svg#icon-menu"></use>
</svg>

<svg>
  <use href="sprites.svg#icon-close"></use>
</svg>
```

## Converting Raster Images to SVG

imgx can convert raster images to SVG using tracing:

```bash
imgx trace image.png --output traced.svg
```

```ts
import { traceImage } from '@stacksjs/imgx'

const result = await traceImage('logo.png', {
  output: 'logo.svg',
  threshold: 128, // 0-255, threshold for converting to black/white
  steps: 4, // Number of color steps (for color tracing)
  background: 'transparent',
})
```

## SVG Transformation

### Colorizing SVGs

Change colors in your SVGs:

```bash
imgx svg icon.svg --fill "#3a7bd5" --stroke "#000000"
```

```ts
await optimizeSvg('icon.svg', {
  colors: {
    fill: '#3a7bd5',
    stroke: '#000000',
  },
})
```

### Resizing

Resize SVGs while preserving aspect ratio:

```bash
imgx svg icon.svg --width 24 --height 24
```

```ts
await optimizeSvg('icon.svg', {
  resize: {
    width: 24,
    height: 24,
    preserveAspectRatio: true,
  },
})
```

## Batch Processing

Process multiple SVGs at once:

```bash
imgx batch "./icons/**/*.svg" --svg-options.removeComments --svg-options.cleanupIDs
```

```ts
import { batchProcess } from '@stacksjs/imgx'

const result = await batchProcess('./icons/**/*.svg', {
  svg: {
    removeComments: true,
    cleanupIDs: true,
    convertColors: true,
  },
  outputDir: './optimized-icons',
})
```

## Configuration

You can set default SVG optimization options in your imgx.config.ts file:

```ts
// imgx.config.ts
export default {
  svg: {
    prettify: false,
    precision: 3,
    multipass: true,
    removeComments: true,
    removeMetadata: true,
    removeViewBox: false,
    removeDimensions: true,
    removeHiddenElements: true,
    removeEmptyAttrs: true,
    removeEmptyContainers: true,
    removeUnusedNS: true,
    cleanupIDs: true,
    cleanupNumericValues: true,
    convertColors: true,
    convertPathData: true,
    mergePaths: true,
  },
}
```
