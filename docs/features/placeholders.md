# Image Placeholders

imgx provides several techniques for generating lightweight image placeholders that can be used for lazy loading, improving perceived performance and user experience.

## Why Use Placeholders?

Image placeholders serve several important purposes:

- **Faster Initial Page Load**: Tiny placeholders (typically <1KB) load almost instantly
- **Reduced Layout Shift**: Reserving space for images prevents content jumping
- **Progressive Enhancement**: Users see a preview while the full image loads
- **Better UX**: Creates a smoother, more polished loading experience

## Placeholder Strategies

imgx supports several placeholder generation strategies:

| Strategy | Description | Size | Visual Quality |
|----------|-------------|------|---------------|
| **Blur** | Low-resolution, blurred version of the image | ~500-800 bytes | Medium |
| **ThumbHash** | Advanced algorithm that preserves colors and shapes | ~100-300 bytes | High |
| **Dominant Color** | Single color that represents the image | ~30-50 bytes | Low |
| **Pixelate** | Low-resolution, pixelated version of the image | ~200-500 bytes | Medium |

## Basic Usage

### CLI

```bash
# Generate a placeholder with the default strategy (blur)
imgx placeholder image.jpg

# Specify a strategy
imgx placeholder image.jpg --strategy thumbhash

# Adjust the size of the placeholder
imgx placeholder image.jpg --width 30

# Save the placeholder to a file
imgx placeholder image.jpg --output placeholder.webp
```

### JavaScript/TypeScript API

```ts
import { createPlaceholder } from '@stacksjs/imgx'

// Generate a blur placeholder
const blurPlaceholder = await createPlaceholder('path/to/image.jpg')

// Generate a ThumbHash placeholder
const thumbhash = await createPlaceholder('path/to/image.jpg', {
  strategy: 'thumbhash',
})

console.log(`Data URL: ${thumbhash.dataURL}`)
```

## Placeholder Strategies in Detail

### Blur Strategy

The blur strategy creates a tiny version of the image and applies a Gaussian blur:

```bash
imgx placeholder image.jpg --strategy blur --width 20 --blur-level 40
```

```ts
const placeholder = await createPlaceholder('image.jpg', {
  strategy: 'blur',
  width: 20, // Width in pixels (height is calculated automatically)
  blurLevel: 40, // 0-100, higher = more blur
  quality: 50, // 0-100
  format: 'webp', // webp, jpeg, or png
})
```

### ThumbHash Strategy

ThumbHash is an advanced algorithm that creates compact, visually pleasing thumbnails:

```bash
imgx placeholder image.jpg --strategy thumbhash
```

```ts
const placeholder = await createPlaceholder('image.jpg', {
  strategy: 'thumbhash',
})
```

ThumbHash is the recommended approach for most use cases due to its superior quality-to-size ratio.

### Dominant Color Strategy

This strategy extracts the dominant color from the image:

```bash
imgx placeholder image.jpg --strategy dominant-color
```

```ts
const placeholder = await createPlaceholder('image.jpg', {
  strategy: 'dominant-color',
  saturation: 1.2, // Adjust color saturation (default: 1.2)
})

console.log(`Dominant color: ${placeholder.dominantColor}`) // e.g., "#3a7bd5"
```

### Pixelate Strategy

This strategy creates a low-resolution pixelated version of the image:

```bash
imgx placeholder image.jpg --strategy pixelate --width 16
```

```ts
const placeholder = await createPlaceholder('image.jpg', {
  strategy: 'pixelate',
  width: 16, // Width in pixels (smaller = more pixelated)
})
```

## Output Formats

### Data URLs

By default, placeholders are returned as base64-encoded data URLs that can be directly used in HTML or CSS:

```html
<img src="data:image/webp;base64,UklGRuYAAABXRUJQVlA4..." alt="Image">
```

### CSS

For dominant color placeholders, imgx can generate CSS:

```bash
imgx placeholder image.jpg --strategy dominant-color --css-filter
```

This returns CSS properties that can be applied:

```css
.placeholder {
  background-color: #3a7bd5;
  filter: contrast(1.1);
}
```

### File Output

You can save placeholders to files:

```bash
imgx placeholder image.jpg --output placeholders/thumb.webp --base64=false
```

## HTML Implementation Examples

### Basic Implementation

```html
<div class="image-container">
  <!-- Placeholder (loads immediately) -->
  <img
    src="data:image/webp;base64,UklGRuYAAABXRUJQVlA4..."
    class="placeholder"
    alt="Description"
  >

  <!-- Full image (loads lazily) -->
  <img
    src="full-image.jpg"
    class="full-image"
    loading="lazy"
    alt="Description"
    onload="this.style.opacity=1; this.previousElementSibling.style.opacity=0;"
  >
</div>
```

With CSS:

```css
.image-container {
  position: relative;
  aspect-ratio: 16/9; /* Match your image aspect ratio */
}

.placeholder,
.full-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s;
}

.full-image {
  opacity: 0;
}
```

### Using with Modern Image Components

For frameworks like React:

```jsx
import React, { useState } from 'react'

function LazyImage({ src, placeholderDataUrl, alt, ...props }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="image-container">
      <img
        src={placeholderDataUrl}
        className={`placeholder ${loaded ? 'hidden' : ''}`}
        alt={alt}
      />
      <img
        src={src}
        className={`full-image ${loaded ? 'visible' : ''}`}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  )
}
```

## Batch Processing Placeholders

You can generate placeholders for multiple images at once:

```bash
imgx batch ./images --placeholders --strategy thumbhash --output-dir ./placeholders
```

Or programmatically:

```ts
import { batchProcess } from '@stacksjs/imgx'

const result = await batchProcess('./images/**/*.jpg', {
  placeholders: {
    strategy: 'thumbhash',
    outputDir: './placeholders',
  },
})
```

## Configuration

You can set default placeholder options in your imgx.config.ts file:

```ts
// imgx.config.ts
export default {
  placeholders: {
    width: 20,
    quality: 50,
    format: 'webp',
    blurLevel: 40,
    base64Encode: true,
    useThumbhash: false,
    strategy: 'blur', // 'blur', 'pixelate', 'thumbhash', 'dominant-color'
    saturation: 1.2,
    cssFilter: false,
  },
}
```
