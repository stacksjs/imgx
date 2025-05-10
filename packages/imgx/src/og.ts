import { join } from 'node:path'
import sharp from 'sharp'
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
