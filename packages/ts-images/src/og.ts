import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resize } from './core'
import { decode, encode } from './codecs'
import { debugLog } from './utils'

export interface SocialImageOptions {
  quality?: number
}

export async function generateSocialImages(
  input: string,
  outputDir: string,
  options: SocialImageOptions = {},
): Promise<Record<string, string>> {
  debugLog('social', `Generating social media images from ${input}`)

  const sizes = {
    'og-github': { width: 1280, height: 640 },
    'og-facebook': { width: 1200, height: 630 },
    'og-twitter': { width: 1200, height: 600 },
    'og-linkedin': { width: 1104, height: 736 },
    'og-instagram': { width: 1080, height: 1080 },
  }

  const results: Record<string, string> = {}

  // Read and decode the source image
  const inputBuffer = await readFile(input)
  const imageData = await decode(inputBuffer)

  for (const [name, size] of Object.entries(sizes)) {
    const outputPath = join(outputDir, `${name}.png`)

    // Resize with cover fit (crop to fill)
    const resized = resize(imageData, {
      width: size.width,
      height: size.height,
      fit: 'cover',
    })

    // Encode as PNG
    const pngBuffer = await encode(resized, 'png', { quality: options.quality || 80 })
    await writeFile(outputPath, pngBuffer)

    results[name] = outputPath
  }

  return results
}
