import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resize } from './core'
import { decode, encode } from './codecs'
import { debugLog } from './utils'

/** The networks `generateSocialImages` knows the aspect ratios for. */
export type SocialNetwork = 'og-github' | 'og-facebook' | 'og-twitter' | 'og-linkedin' | 'og-instagram'

export interface SocialImageOptions {
  quality?: number
  /**
   * Container for the generated cards. Defaults to `jpeg`.
   *
   * Social cards are photographs, and PNG is lossless: a 1200x630 card came
   * out at 2 MB or more, times five networks, for images nobody inspects at
   * that fidelity. JPEG at the default quality is a twentieth of the size for
   * no visible difference. Pass `png` when a card is flat colour or carries a
   * transparent region, where PNG genuinely wins.
   */
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  /**
   * Which cards to build. Defaults to all five. Most sites need one or two,
   * and every extra card is a file to store, ship and keep in step.
   */
  networks?: SocialNetwork[]
}

export async function generateSocialImages(
  input: string,
  outputDir: string,
  options: SocialImageOptions = {},
): Promise<Record<string, string>> {
  debugLog('social', `Generating social media images from ${input}`)

  const allSizes: Record<SocialNetwork, { width: number, height: number }> = {
    'og-github': { width: 1280, height: 640 },
    'og-facebook': { width: 1200, height: 630 },
    'og-twitter': { width: 1200, height: 600 },
    'og-linkedin': { width: 1104, height: 736 },
    'og-instagram': { width: 1080, height: 1080 },
  }

  const requested = options.networks ?? (Object.keys(allSizes) as SocialNetwork[])
  const sizes = Object.fromEntries(requested.map(network => [network, allSizes[network]]))
  const format = options.format ?? 'jpeg'
  const extension = format === 'jpeg' ? 'jpg' : format

  const results: Record<string, string> = {}

  // Read and decode the source image
  const inputBuffer = new Uint8Array(await readFile(input))
  const imageData = await decode(inputBuffer)

  for (const [name, size] of Object.entries(sizes)) {
    const outputPath = join(outputDir, `${name}.${extension}`)

    // Resize with cover fit (crop to fill)
    const resized = resize(imageData, {
      width: size.width,
      height: size.height,
      fit: 'cover',
    })

    const encoded = await encode(resized, format, { quality: options.quality || 80 })
    await writeFile(outputPath, encoded)

    results[name] = outputPath
  }

  return results
}
