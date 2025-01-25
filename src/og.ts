import type { ProcessOptions } from './types'
import { join } from 'node:path'
import sharp from 'sharp'
import { debugLog } from './utils'

export async function generateSocialImages(
  input: string,
  outputDir: string,
  options: ProcessOptions = {},
): Promise<Record<string, string>> {
  debugLog('social', `Generating social media images from ${input}`)

  const sizes = {
    'og-facebook': { width: 1200, height: 630 },
    'og-twitter': { width: 1200, height: 600 },
    'og-linkedin': { width: 1104, height: 736 },
    'og-instagram': { width: 1080, height: 1080 },
  }

  const results = {}

  for (const [name, size] of Object.entries(sizes)) {
    const outputPath = join(outputDir, `${name}.png`)

    await sharp(input)
      .resize(size.width, size.height, { fit: 'cover', position: 'centre' })
      .png({ quality: options.quality || 80 })
      .toFile(outputPath)

    results[name] = outputPath
  }

  return results
}
