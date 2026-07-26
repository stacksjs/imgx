import type { ImageData } from './core/image-data'
import type { Font } from './font'
import type { RGBA } from './text'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resize } from './core'
import { createImageData } from './core/image-data'
import { decode, encode } from './codecs'
import { drawText, fillRect, fillRoundedRect, fillVerticalScrim, layoutText } from './text'
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

/**
 * A composed share card: a photograph, a scrim, the brand, and a headline.
 *
 * The alternative to this is a cropped photograph with no words on it, which
 * is what `generateSocialImages` produces. A card that says what the page is
 * survives being reposted, quoted, and shown at thumbnail size in a feed.
 */
export interface SocialCardOptions {
  /** Background photograph. Cover-cropped to the card. */
  background?: string
  /** Flat background when there is no photograph. Defaults to near-black. */
  backgroundColor?: RGBA
  /** The headline. Wrapped, and capped at `titleLines`. */
  title: string
  /** Small line above the title. The section, usually. */
  eyebrow?: string
  /** Small line below the title. */
  subtitle?: string
  /** Wordmark, drawn top-left. */
  brand?: string
  /** Bold face, used for the brand and the title. Required. */
  titleFont: Font
  /** Face for the eyebrow and subtitle. Falls back to `titleFont`. */
  bodyFont?: Font
  width?: number
  height?: number
  /** Headline and brand colour. */
  color?: RGBA
  /** Eyebrow and rule colour. */
  accent?: RGBA
  /**
   * Plate painted behind the mark before `drawMark` runs. Defaults to white,
   * so a mark drawn in its own colours reads over any photograph.
   */
  markPlate?: RGBA
  /**
   * Paint the logo mark into the square left of the wordmark.
   *
   * A library cannot know what a brand's mark looks like, so it supplies the
   * plate and the position and hands the box back: `box` is in card pixels,
   * and the primitives in `./shapes` draw into `card` directly. Without this
   * the brand row is the wordmark alone.
   */
  drawMark?: (card: ImageData, box: { x: number, y: number, size: number }) => void
  /** Subtitle colour. Defaults to a dimmed `color`. */
  mutedColor?: RGBA
  titleSize?: number
  titleLines?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
}

export async function generateSocialCard(
  outputPath: string,
  options: SocialCardOptions,
): Promise<string> {
  const width = options.width ?? 1200
  const height = options.height ?? 630
  const color = options.color ?? { r: 255, g: 255, b: 255 }
  const accent = options.accent ?? { r: 226, g: 87, b: 30 }
  const muted = options.mutedColor ?? { r: color.r, g: color.g, b: color.b, a: 0.72 }
  const bodyFont = options.bodyFont ?? options.titleFont
  const padding = Math.round(width * 0.065)

  let card: ImageData
  if (options.background) {
    const source = await decode(new Uint8Array(await readFile(options.background)))
    card = resize(source, { width, height, fit: 'cover' })
  }
  else {
    card = createImageData(width, height, {
      fill: options.backgroundColor ?? { r: 12, g: 15, b: 11, a: 1 },
    })
  }

  // A photograph is never uniformly dark enough to read white text against.
  // Two passes: a flat wash so the brand row at the top has contrast wherever
  // the image happens to be bright, and an eased scrim over the lower half
  // where the headline sits. A stubble field is nearly white, so the scrim has
  // to reach almost opaque at the foot or the eyebrow disappears into it.
  if (options.background) {
    fillRect(card, { x: 0, y: 0, width, height }, { r: 8, g: 11, b: 7, a: 0.22 })
    fillVerticalScrim(card, { x: 0, y: height * 0.26, width, height: height * 0.74 }, { r: 8, g: 11, b: 7 }, 0, 0.94)
  }

  // Brand row, top left.
  //
  // The mark sits on its own solid plate rather than being drawn straight
  // onto the photograph: over a field, an outlined mark let the texture
  // through and the accent dots inside it disappeared into whatever happened
  // to be behind them.
  if (options.brand) {
    const markSize = Math.round(width * 0.033)
    const hasMark = Boolean(options.drawMark)

    if (hasMark) {
      // The plate is larger than the mark so the mark has margin inside it,
      // the way a logo has clear space around it in any brand sheet.
      const plate = Math.round(markSize * 1.28)
      const inset = Math.round((plate - markSize) / 2)

      fillRoundedRect(
        card,
        { x: padding, y: padding, width: plate, height: plate, radius: plate * 0.24 },
        options.markPlate ?? { r: 255, g: 255, b: 255 },
      )

      options.drawMark!(card, { x: padding + inset, y: padding + inset, size: markSize })
    }

    drawText(card, {
      text: options.brand,
      font: options.titleFont,
      size: Math.round(width * 0.024),
      x: hasMark ? padding + markSize * 1.72 : padding,
      y: padding + markSize * 0.86,
      color,
      letterSpacing: -0.01,
    })
  }

  // The text block is laid out from the bottom up, so a two-line title and a
  // three-line title both sit on the same baseline near the foot of the card.
  const titleSize = options.titleSize ?? Math.round(width * 0.062)
  const maxTextWidth = width - padding * 2
  const titleMetrics = layoutText({
    text: options.title,
    font: options.titleFont,
    size: titleSize,
    maxWidth: maxTextWidth,
    lineHeight: 1.14,
    letterSpacing: -0.018,
    maxLines: options.titleLines ?? 3,
  })

  const subtitleSize = Math.round(width * 0.0245)
  const eyebrowSize = Math.round(width * 0.019)
  const subtitleBlock = options.subtitle ? subtitleSize * 1.35 + padding * 0.32 : 0

  const titleBottom = height - padding - subtitleBlock
  const firstBaseline = titleBottom - titleMetrics.height + titleMetrics.lineHeight * 0.78

  if (options.eyebrow) {
    const eyebrowBaseline = firstBaseline - titleMetrics.lineHeight * 0.72 - padding * 0.18
    drawText(card, {
      text: options.eyebrow.toUpperCase(),
      font: bodyFont,
      size: eyebrowSize,
      x: padding,
      y: eyebrowBaseline,
      color: accent,
      letterSpacing: 0.1,
    })
  }

  drawText(card, {
    text: options.title,
    font: options.titleFont,
    size: titleSize,
    x: padding,
    y: firstBaseline,
    color,
    maxWidth: maxTextWidth,
    lineHeight: 1.14,
    letterSpacing: -0.018,
    maxLines: options.titleLines ?? 3,
  })

  if (options.subtitle) {
    drawText(card, {
      text: options.subtitle,
      font: bodyFont,
      size: subtitleSize,
      x: padding,
      y: height - padding - subtitleSize * 0.15,
      color: muted,
      maxWidth: maxTextWidth,
      maxLines: 1,
    })
  }

  const format = options.format ?? 'jpeg'
  const encoded = await encode(card, format, { quality: options.quality ?? 82 })
  await writeFile(outputPath, encoded)

  return outputPath
}
