import type { ProcessOptions } from './types'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { debugLog } from './utils'

interface ResponsiveImageOptions extends ProcessOptions {
  breakpoints: number[]
  formats: ('webp' | 'avif' | 'jpeg' | 'png')[]
  generateSrcset?: boolean
  outputDir?: string
  filenameTemplate?: string
}

interface ResponsiveImageResult {
  original: string
  variants: Array<{
    path: string
    width: number
    format: string
    size: number
  }>
  srcset: Record<string, string[]>
  htmlMarkup: string
}

export async function generateResponsiveImages(
  options: ResponsiveImageOptions,
): Promise<ResponsiveImageResult> {
  const {
    input,
    breakpoints,
    formats,
    outputDir = 'dist',
    quality = 80,
    filenameTemplate = '[name]-[width].[ext]',
    generateSrcset = true,
  } = options

  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string path')
  }

  debugLog('responsive', `Generating responsive images for ${input}`)

  const inputBuffer = await readFile(input)
  const metadata = await sharp(inputBuffer).metadata()
  const originalWidth = metadata.width || 0

  const variants: Array<{
    path: string
    width: number
    format: string
    size: number
  }> = []

  const srcset: Record<string, string[]> = {}

  for (const format of formats) {
    srcset[format] = []

    for (const width of breakpoints) {
      if (width > originalWidth)
        continue

      const inputName = input.split('/').pop()?.split('.')[0] || 'image'
      const filename = filenameTemplate
        .replace('[name]', inputName)
        .replace('[width]', width.toString())
        .replace('[ext]', format)

      const outputPath = join(outputDir, filename)

      await sharp(inputBuffer)
        .resize(width)[format]({ quality })
        .toFile(outputPath)

      const { size } = await sharp(outputPath).metadata()

      variants.push({
        path: outputPath,
        width,
        format,
        size: size || 0,
      })

      if (generateSrcset) {
        srcset[format].push(`${outputPath} ${width}w`)
      }
    }
  }

  // Generate HTML markup
  const pictureMarkup = `
<picture>
  ${formats.map(format => `
  <source
    type="image/${format}"
    srcset="${srcset[format].join(', ')}"
    sizes="(max-width: ${Math.max(...breakpoints)}px) 100vw, ${Math.max(...breakpoints)}px"
  />`).join('\n')}
  <img
    src="${variants[0]?.path || ''}"
    alt=""
    loading="lazy"
    decoding="async"
    width="${variants[0]?.width || 0}"
    height="${Math.round((variants[0]?.width || 0) * ((metadata.height || 0) / (metadata.width || 1)))}"
  />
</picture>`.trim()

  return {
    original: input,
    variants,
    srcset,
    htmlMarkup: pictureMarkup,
  }
}

interface ImageSetOptions {
  input: string
  name: string
  sizes: Array<{ width: number, height?: number, suffix?: string }>
  outputDir: string
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
}

export async function generateImageSet(options: ImageSetOptions): Promise<Array<{
  size: { width: number, height?: number, suffix?: string }
  path: string
}>> {
  const { input, name, sizes, outputDir, format = 'png', quality = 80 } = options

  debugLog('imageset', `Generating image set for ${input}`)

  const results: Array<{
    size: { width: number, height?: number, suffix?: string }
    path: string
  }> = []

  for (const size of sizes) {
    const suffix = size.suffix || `${size.width}x${size.height || size.width}`
    const outputPath = join(outputDir, `${name}-${suffix}.${format}`)

    await sharp(input)
      .resize(size.width, size.height)[format]({ quality })
      .toFile(outputPath)

    results.push({
      size,
      path: outputPath,
    })
  }

  return results
}
