import type { ImageMetadata } from '../../src/codecs'
import { encode, getMetadata } from '../../src/codecs'
import { createImageData } from '../../src/core/image-data'

type SupportedFormat = 'png' | 'jpeg' | 'webp'

function inferFormatFromPath(path: string): SupportedFormat {
  const lower = path.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg'))
    return 'jpeg'
  if (lower.endsWith('.webp'))
    return 'webp'
  return 'png'
}

/**
 * Create a solid-color fixture image at `path`. Replaces the
 * `sharp({ create: ... }).<format>().toFile(path)` pattern that
 * previous tests used; built on ts-images' own codecs so the test
 * suite dogfoods the library it tests.
 *
 * If `format` is omitted, it's inferred from `path` (`.png`/`.jpg`/
 * `.jpeg`/`.webp`).
 */
export async function createSolidImage(
  path: string,
  width: number,
  height: number,
  rgb: { r: number, g: number, b: number },
  format?: SupportedFormat,
): Promise<void> {
  const fmt = format ?? inferFormatFromPath(path)
  const img = createImageData(width, height, {
    fill: { ...rgb, a: 255 },
  })
  const bytes = await encode(img, fmt)
  await Bun.write(path, bytes)
}

/**
 * Read image metadata from a file. Replaces `sharp(path).metadata()`.
 */
export async function readMetadata(path: string): Promise<ImageMetadata> {
  const bytes = await Bun.file(path).bytes()
  return getMetadata(bytes)
}
