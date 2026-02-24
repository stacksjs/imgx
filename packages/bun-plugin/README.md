# bun-plugin-imgx

A Bun Bundler plugin for automatic image optimization during the build process using ts-images.

## Installation

```bash
bun add bun-plugin-imgx -d
# or
npm install bun-plugin-imgx --save-dev
```

## Usage

```typescript
// build.ts
import { imgx } from 'bun-plugin-imgx'

await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
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
| `resize` | `object` | - | Resize options (width, height) |
| `include` | `(string \| RegExp)[]` | `[]` | Patterns to include |
| `exclude` | `(string \| RegExp)[]` | `[]` | Patterns to exclude |

## Examples

### Basic Usage

```typescript
import { imgx } from 'bun-plugin-imgx'

await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  plugins: [imgx()],
})
```

### With Custom Options

```typescript
import { imgx } from 'bun-plugin-imgx'

await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  plugins: [
    imgx({
      quality: 90,
      format: 'avif',
    }),
  ],
})
```

## License

MIT
