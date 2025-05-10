# Integration Plugins

imgx provides integration plugins for popular JavaScript build tools like Vite and Bun, enabling automatic image optimization during your build process.

## Vite Plugin

The Vite plugin automatically optimizes images during the build process, reducing file sizes without sacrificing quality.

### Installation

If you've installed imgx, the Vite plugin is available as a separate package:

```bash
npm install --save-dev @stacksjs/vite-plugin
```

### Basic Usage

```ts
import { viteImgxPlugin } from '@stacksjs/vite-plugin'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    viteImgxPlugin(),
  ],
})
```

### Configuration Options

The Vite plugin accepts all standard imgx options plus some plugin-specific options:

```ts
import { viteImgxPlugin } from '@stacksjs/vite-plugin'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    viteImgxPlugin({
      // Plugin-specific options
      include: ['**/*.{jpg,jpeg,png,webp,avif,svg}'], // File patterns to include
      exclude: ['node_modules/**'], // File patterns to exclude
      disabled: process.env.NODE_ENV === 'development', // Disable in development mode

      // Standard imgx options
      quality: 80,
      format: 'webp',
      progressive: true,
      preserveMetadata: false,
    }),
  ],
})
```

### How It Works

1. The plugin scans your project for image files that match the include/exclude patterns
2. During the Vite build process, it optimizes these images in-place
3. It preserves the original format unless specified otherwise
4. Optimized images are emitted to your build output directory

## Bun Plugin

The Bun plugin provides similar functionality for Bun projects, automatically optimizing images during builds.

### Installation

```bash
bun install --dev @stacksjs/bun-plugin
```

### Basic Usage

```ts
// bunfig.ts
import { bunImgxPlugin } from '@stacksjs/bun-plugin'

export default {
  plugins: [
    bunImgxPlugin(),
  ],
}
```

### Configuration Options

The Bun plugin accepts the same configuration options as the Vite plugin:

```ts
// bunfig.ts
import { bunImgxPlugin } from '@stacksjs/bun-plugin'

export default {
  plugins: [
    bunImgxPlugin({
      include: ['**/*.{jpg,jpeg,png,webp,avif,svg}'],
      exclude: ['node_modules/**'],
      disabled: false,

      quality: 80,
      format: 'webp',
      progressive: true,
    }),
  ],
}
```

## Differences Between Plugins

While both plugins provide similar functionality, there are some differences:

- **Default Behavior**: The Vite plugin is disabled in development mode by default, while the Bun plugin is always enabled unless explicitly disabled
- **Performance**: The Bun plugin may offer better performance due to Bun's optimized runtime
- **Integration**: Each plugin is designed to work seamlessly with its respective build tool

## Testing Plugin Integration

You can verify that the plugins are working correctly:

### For Vite:

```bash
# Run a production build
npm run build

# Check the size of optimized images in your dist folder
du -sh dist/assets/*.{jpg,png,webp,avif,svg}
```

### For Bun:

```bash
# Run a production build
bun run build

# Check the size of optimized images in your output folder
du -sh dist/assets/*.{jpg,png,webp,avif,svg}
```
