# Responsive Images

imgx makes it easy to generate responsive image sets for modern web development, ensuring optimal image delivery for different screen sizes and device capabilities.

## Benefits of Responsive Images

- **Improved Performance**: Serve appropriately sized images to reduce bandwidth usage
- **Better User Experience**: Faster page loads on all devices
- **SEO Benefits**: Speed improvements lead to better search engine rankings
- **Enhanced Adaptability**: Your images adapt to different viewport sizes

## Creating Responsive Image Sets

### CLI

```bash
# Generate responsive images with default sizes [320, 640, 960, 1280, 1920]
imgx responsive path/to/image.jpg

# Specify custom sizes
imgx responsive path/to/image.jpg --sizes 480,768,1024,1600

# Generate in multiple formats
imgx responsive path/to/image.jpg --formats webp,avif,jpeg

# Specify output directory
imgx responsive path/to/image.jpg --output-dir ./public/images/responsive
```

### JavaScript/TypeScript API

```ts
import { generateResponsive } from '@stacksjs/imgx'

// Generate responsive images with default settings
const images = await generateResponsive('path/to/image.jpg')

// With custom options
const customImages = await generateResponsive('path/to/image.jpg', {
  sizes: [480, 768, 1024, 1600],
  formats: ['webp', 'jpeg'],
  outputDir: './public/images/responsive',
  quality: 80,
  filenameTemplate: '[name]-[width]w.[format]',
})

// The result contains information about all generated images
console.log(`Generated ${images.length} responsive images`)
```

## Configuration

You can set default responsive image options in your configuration file:

```ts
// imgx.config.ts
export default {
  responsive: {
    sizes: [320, 640, 960, 1280, 1920],
    formats: ['webp', 'jpeg'],
    quality: 80,
    generateSrcset: true,
    filenameTemplate: '[name]-[width].[ext]',
  },
}
```

## HTML Usage

imgx can also generate the HTML code for responsive images with appropriate srcset and sizes attributes:

```bash
imgx responsive path/to/image.jpg --generate-html
```

This will output HTML similar to:

```html
<picture>
  <source
    type="image/webp"
    srcset="
      /images/image-320.webp 320w,
      /images/image-640.webp 640w,
      /images/image-960.webp 960w,
      /images/image-1280.webp 1280w,
      /images/image-1920.webp 1920w
    "
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  <img
    src="/images/image-1280.jpeg"
    srcset="
      /images/image-320.jpeg 320w,
      /images/image-640.jpeg 640w,
      /images/image-960.jpeg 960w,
      /images/image-1280.jpeg 1280w,
      /images/image-1920.jpeg 1920w
    "
    sizes="(max-width: 768px) 100vw, 50vw"
    width="1280"
    height="720"
    alt="Image description"
    loading="lazy"
  >
</picture>
```

## Custom Filename Templates

You can customize how the responsive image filenames are generated using the `filenameTemplate` option:

```ts
await generateResponsive('path/to/image.jpg', {
  filenameTemplate: '[name]-[width]w.[format]',
})
```

Available placeholders:
- `[name]`: Original filename without extension
- `[width]`: Width of the generated image
- `[height]`: Height of the generated image
- `[format]` or `[ext]`: File extension/format

## Art Direction

For more complex responsive image requirements (art direction), you may need to process multiple source images. imgx can help with this workflow:

```bash
# Generate different aspect ratios for different screen sizes
imgx responsive path/to/landscape.jpg --sizes 960,1280,1920 --output-dir ./public/images/desktop
imgx responsive path/to/portrait.jpg --sizes 320,480,640 --output-dir ./public/images/mobile
```
