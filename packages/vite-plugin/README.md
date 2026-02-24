# vite-plugin-imgx

A Vite plugin for automatic image optimization during development and production builds using ts-images.

## Installation

```bash
bun add vite-plugin-imgx -d
# or
npm install vite-plugin-imgx --save-dev
```

## Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { imgx } from 'vite-plugin-imgx'

export default defineConfig({
  plugins: [
    imgx({
      // Options
    }),
  ],
})
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `quality` | `number` | `80` | Output image quality (1-100) |
| `format` | `string` | `'webp'` | Output format (webp, avif, png, jpeg) |
| `include` | `(string \| RegExp)[]` | `[]` | Patterns to include |
| `exclude` | `(string \| RegExp)[]` | `[]` | Patterns to exclude |

## Examples

### Basic Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { imgx } from 'vite-plugin-imgx'

export default defineConfig({
  plugins: [imgx()],
})
```

### With Custom Options

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { imgx } from 'vite-plugin-imgx'

export default defineConfig({
  plugins: [
    imgx({
      quality: 90,
      format: 'avif',
      include: [/\.png$/, /\.jpg$/],
    }),
  ],
})
```

## License

MIT
