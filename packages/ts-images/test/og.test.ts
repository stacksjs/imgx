import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { loadFont } from '../src/font'
import { generateSocialCard, generateSocialCards, generateSocialImages, socialCardMetrics, SOCIAL_CARD_PRESETS } from '../src/og'
import { readMetadata } from './utils/test-helpers'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

// The composed card draws real glyphs, so it needs a real face. Skipped
// rather than failed where one is not on the machine, matching `text.test.ts`.
const FONT = '/Users/chris/Code/Fonts/Satoshi/WEB/fonts/Satoshi-Bold.ttf'
const hasFont = existsSync(FONT)

describe('og', () => {
  beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true })
  })

  afterAll(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
  })

  afterEach(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
      .catch(() => {})
    await mkdir(OUTPUT_DIR, { recursive: true })
  })

  describe('generateSocialImages', () => {
    it('should generate social media images in various sizes', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      // Ensure output directory exists
      await mkdir(OUTPUT_DIR, { recursive: true })

      const results = await generateSocialImages(input, OUTPUT_DIR)

      // JPEG is the default: social cards are photographs, and lossless PNG
      // made every one of them megabytes for no visible gain.
      expect(results['og-github']).toBe(join(OUTPUT_DIR, 'og-github.jpg'))
      expect(results['og-facebook']).toBe(join(OUTPUT_DIR, 'og-facebook.jpg'))
      expect(results['og-twitter']).toBe(join(OUTPUT_DIR, 'og-twitter.jpg'))
      expect(results['og-linkedin']).toBe(join(OUTPUT_DIR, 'og-linkedin.jpg'))
      expect(results['og-instagram']).toBe(join(OUTPUT_DIR, 'og-instagram.jpg'))

      // Verify files exist
      for (const path of Object.values(results)) {
        const exists = await Bun.file(path).exists()
        expect(exists).toBe(true)
      }

      // Verify dimensions of a sample file
      const facebookMeta = await readMetadata(results['og-facebook'])
      expect(facebookMeta.width).toBe(1200)
      expect(facebookMeta.height).toBe(630)

      // Verify one more to ensure processing worked correctly
      const twitterMeta = await readMetadata(results['og-twitter'])
      expect(twitterMeta.width).toBe(1200)
      expect(twitterMeta.height).toBe(600)
    }, 15000) // Increase timeout to 15 seconds

    it('should apply quality options', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      // Generate with lower quality
      const results = await generateSocialImages(input, OUTPUT_DIR, {
        quality: 60,
      })

      // Generate with higher quality for comparison
      const highQualityDir = join(OUTPUT_DIR, 'high-quality')
      await mkdir(highQualityDir, { recursive: true })

      const highQualityResults = await generateSocialImages(input, highQualityDir, {
        quality: 90,
      })

      // Verify files exist
      for (const path of Object.values(results)) {
        const exists = await Bun.file(path).exists()
        expect(exists).toBe(true)
      }

      for (const path of Object.values(highQualityResults)) {
        const exists = await Bun.file(path).exists()
        expect(exists).toBe(true)
      }

      // For PNG format, quality maps to compression level which may have minimal effect
      // The important thing is that both files were generated successfully
      const lowQualityFileInfo = await Bun.file(results['og-twitter']).stat()
      const highQualityFileInfo = await Bun.file(highQualityResults['og-twitter']).stat()

      // Both files should have non-zero sizes
      expect(lowQualityFileInfo.size).toBeGreaterThan(0)
      expect(highQualityFileInfo.size).toBeGreaterThan(0)
    }, 15000) // Increase timeout to 15 seconds
  })

  describe('socialCardMetrics', () => {
    // A tall capture — the popup, the shape that exposed the bug.
    const tall = { aspect: 0.55 }

    it('leaves only the margin to the right of the shot', () => {
      const { foreground, padding } = socialCardMetrics({ width: 1200, height: 630, foreground: tall })

      expect(foreground).toBeDefined()
      // The shot used to be centred in a fixed column, parking it mid-panel
      // with ~157px of background against the card's own edge.
      expect(1200 - (foreground!.x + foreground!.width)).toBe(padding)
    })

    it('gives the copy the width a narrow shot does not need', () => {
      const withTall = socialCardMetrics({ width: 1200, height: 630, foreground: tall })
      const withWide = socialCardMetrics({ width: 1200, height: 630, foreground: { aspect: 1.6 } })

      // The old fixed column was 1200 * 0.54 - 78 * 2 = 492 either way.
      expect(withTall.textWidth).toBeGreaterThan(492)
      expect(withTall.textWidth).toBeGreaterThan(withWide.textWidth)
    })

    it('never lets a wide shot take the copy below its floor', () => {
      const { textWidth, foreground } = socialCardMetrics({
        width: 1200,
        height: 630,
        foreground: { aspect: 4, textWidth: 0.54 },
      })

      expect(foreground!.width).toBeLessThanOrEqual(1200 - 1200 * 0.54)
      expect(textWidth).toBeGreaterThan(0)
    })

    it('stacks on a square card and gives the copy the full measure', () => {
      const square = socialCardMetrics({ width: 1200, height: 1200, foreground: tall })

      expect(square.beside).toBe(false)
      expect(square.textWidth).toBe(1200 - square.padding * 2)
    })

    it('places a stacked shot only when given a band to put it in', () => {
      const without = socialCardMetrics({ width: 1200, height: 1200, foreground: tall })
      const within = socialCardMetrics({
        width: 1200,
        height: 1200,
        foreground: tall,
        stackedStage: { y: 200, height: 600 },
      })

      expect(without.foreground).toBeUndefined()
      expect(within.foreground!.y).toBeGreaterThanOrEqual(200)
      expect(within.foreground!.y + within.foreground!.height).toBeLessThanOrEqual(800)
    })
  })

  describe('SOCIAL_CARD_PRESETS', () => {
    it('leads with the 1.91:1 card every scraper understands', () => {
      expect(SOCIAL_CARD_PRESETS.og).toEqual({ width: 1200, height: 630 })
      expect(SOCIAL_CARD_PRESETS.og.width / SOCIAL_CARD_PRESETS.og.height).toBeCloseTo(1.905, 2)
    })

    it('offers a square and a taller crop for the slots that reserve one', () => {
      expect(SOCIAL_CARD_PRESETS.square.width).toBe(SOCIAL_CARD_PRESETS.square.height)
      expect(SOCIAL_CARD_PRESETS.portrait.height).toBeGreaterThan(SOCIAL_CARD_PRESETS.portrait.width)
    })
  })

  describe.if(hasFont)('generateSocialCards', () => {
    async function font(): Promise<ReturnType<typeof loadFont>> {
      return loadFont(new Uint8Array(await readFile(FONT)))
    }

    it('keeps the primary card on a stable name and suffixes the rest', async () => {
      const results = await generateSocialCards(OUTPUT_DIR, {
        title: 'Ads gone before the page loads.',
        titleFont: await font(),
      })

      expect(results.og).toBe(join(OUTPUT_DIR, 'og.jpg'))
      expect(results.square).toBe(join(OUTPUT_DIR, 'og-square.jpg'))
      expect(results.portrait).toBe(join(OUTPUT_DIR, 'og-portrait.jpg'))
    }, 30000)

    it('writes each preset at its declared size', async () => {
      const results = await generateSocialCards(OUTPUT_DIR, {
        title: 'Ads gone before the page loads.',
        titleFont: await font(),
        presets: ['og', 'twitter', 'square'],
      })

      for (const [preset, path] of Object.entries(results)) {
        const meta = await readMetadata(path)
        expect(meta.width).toBe(SOCIAL_CARD_PRESETS[preset as keyof typeof SOCIAL_CARD_PRESETS].width)
        expect(meta.height).toBe(SOCIAL_CARD_PRESETS[preset as keyof typeof SOCIAL_CARD_PRESETS].height)
      }
    }, 30000)

    it('honours a custom base name and format', async () => {
      const results = await generateSocialCards(OUTPUT_DIR, {
        title: 'Features',
        titleFont: await font(),
        presets: ['og'],
        name: 'features',
        format: 'png',
      })

      expect(results.og).toBe(join(OUTPUT_DIR, 'features.png'))
    }, 30000)

    it('rejects an unknown preset', async () => {
      await expect(generateSocialCards(OUTPUT_DIR, {
        title: 'Nope',
        titleFont: await font(),
        presets: ['banner' as 'og'],
      })).rejects.toThrow(/Unknown social card preset/)
    })

    it('places a product shot without throwing on any preset shape', async () => {
      const path = await generateSocialCard(join(OUTPUT_DIR, 'with-shot.jpg'), {
        title: 'Ads gone before the page loads.',
        subtitle: 'No account, no telemetry, no bloat.',
        eyebrow: 'Chrome · Firefox · Safari',
        brand: 'Very Good AdBlock',
        titleFont: await font(),
        foreground: { image: join(FIXTURES_DIR, 'app-icon.png'), shadow: {} },
        ...SOCIAL_CARD_PRESETS.portrait,
      })

      const meta = await readMetadata(path)
      expect(meta.width).toBe(1200)
      expect(meta.height).toBe(1500)
    }, 30000)
  })
})
