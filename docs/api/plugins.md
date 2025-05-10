# Plugins API Reference

imgx provides integration plugins for popular build tools. This page documents the APIs for the Vite and Bun plugins.

## Vite Plugin

The Vite plugin automatically optimizes your images during the build process.

### Installation

```bash
npm install --save-dev vite-plugin-imgx
```

### API

```ts
function viteImgxPlugin(options?: ImgxPluginOptions): Plugin
```

**Type Definitions:**

```ts
interface ImgxPluginOptions extends Partial<ProcessOptions> {
  include?: string[] // File patterns to include
  exclude?: string[] // File patterns to exclude
  disabled?: boolean // Whether the plugin is disabled
}

// ProcessOptions are the standard imgx options
interface ProcessOptions {
  quality?: number
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  progressive?: boolean
  preserveMetadata?: boolean
  // ... other imgx options
}
```

**Parameters:**
- `options`: Optional configuration object extending imgx's ProcessOptions with plugin-specific options
  - `include`: Array of glob patterns for files to include (default: `['**/*.{jpg,jpeg,png,webp,avif,svg}']`)
  - `exclude`: Array of glob patterns for files to exclude (default: `['node_modules/**']`)
  - `disabled`: Whether to disable the plugin (default: `true` in development, `false` in production)
  - ...plus all standard imgx options

**Returns:** A Vite plugin object

### Examples

**Basic usage:**

```ts
import { viteImgxPlugin } from 'vite-plugin-imgx'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    viteImgxPlugin(),
  ],
})
```

**With configuration:**

```ts
import { viteImgxPlugin } from 'vite-plugin-imgx'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    viteImgxPlugin({
      // Plugin-specific options
      include: ['**/*.{jpg,png,webp}'],
      exclude: ['node_modules/**', 'public/excluded/**'],
      disabled: false, // Force enable in all modes

      // Standard imgx options
      quality: 85,
      format: 'webp',
      progressive: true,
    }),
  ],
})
```

## Bun Plugin

The Bun plugin provides similar functionality for Bun projects.

### Installation

```bash
bun install --dev bun-plugin-imgx
```

### API

```ts
function bunImgxPlugin(options?: ImgxPluginOptions): BunPlugin
```

The type definitions are the same as for the Vite plugin:

```ts
interface ImgxPluginOptions extends Partial<ProcessOptions> {
  include?: string[]
  exclude?: string[]
  disabled?: boolean
}
```

**Parameters:**
- `options`: Optional configuration object with the same options as the Vite plugin
  - `include`: Array of glob patterns for files to include (default: `['**/*.{jpg,jpeg,png,webp,avif,svg}']`)
  - `exclude`: Array of glob patterns for files to exclude (default: `['node_modules/**']`)
  - `disabled`: Whether to disable the plugin (default: `false`)
  - ...plus all standard imgx options

**Returns:** A Bun plugin object

### Examples

**Basic usage:**

```ts
// bunfig.ts
import { bunImgxPlugin } from 'bun-plugin-imgx'

export default {
  plugins: [
    bunImgxPlugin(),
  ],
}
```

**With configuration:**

```ts
// bunfig.ts
import { bunImgxPlugin } from 'bun-plugin-imgx'

export default {
  plugins: [
    bunImgxPlugin({
      include: ['src/**/*.{jpg,png}'],
      exclude: ['src/excluded/**'],

      quality: 90,
      format: 'webp',
      progressive: true,
    }),
  ],
}
```

## How the Plugins Work

Both plugins follow a similar pattern for optimizing images:

1. During the build process, they intercept image file requests that match the configured include/exclude patterns
2. For each matching file, they call imgx's underlying optimization functions
3. They replace the original image content with the optimized version
4. The optimizations happen in memory, so the original files are not modified

The main difference is in how they integrate with their respective build tools:

- The Vite plugin uses Vite's plugin API and operates during the build phase
- The Bun plugin uses Bun's plugin system and works during file loading

## Plugin Performance Considerations

For large projects with many images, optimizing all images can slow down the build process. Consider these strategies:

1. Use more specific `include` patterns to limit the number of processed files
2. Disable the plugin during development for faster builds
3. Set `NODE_ENV=production` for Vite to automatically enable the plugin only in production builds
4. Use a higher `quality` setting (90-95) for a faster, less aggressive optimization

## Custom Plugin Configuration

You can create a reusable plugin configuration in a separate file:

```ts
// imgx-plugin-config.ts
import type { ImgxPluginOptions } from 'vite-plugin-imgx'

export const imgxConfig: ImgxPluginOptions = {
  include: ['**/*.{jpg,png}'],
  exclude: ['node_modules/**', 'public/vendor/**'],
  quality: 85,
  format: 'webp',
  progressive: true,
}
```

Then import and use this configuration in your build files:

```ts
import { viteImgxPlugin } from 'vite-plugin-imgx'
// vite.config.ts
import { defineConfig } from 'vite'
import { imgxConfig } from './imgx-plugin-config'

export default defineConfig({
  plugins: [
    viteImgxPlugin(imgxConfig),
  ],
})
```

```ts
// bunfig.ts
import { bunImgxPlugin } from 'bun-plugin-imgx'
import { imgxConfig } from './imgx-plugin-config'

export default {
  plugins: [
    bunImgxPlugin(imgxConfig),
  ],
}
```
