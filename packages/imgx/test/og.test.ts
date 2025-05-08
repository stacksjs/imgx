import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { generateSocialImages } from '../src/og'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

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

      const results = await generateSocialImages(input, OUTPUT_DIR)

      // Check all standard OG images were created
      expect(results['og-github']).toBe(join(OUTPUT_DIR, 'og-github.png'))
      expect(results['og-facebook']).toBe(join(OUTPUT_DIR, 'og-facebook.png'))
      expect(results['og-twitter']).toBe(join(OUTPUT_DIR, 'og-twitter.png'))
      expect(results['og-linkedin']).toBe(join(OUTPUT_DIR, 'og-linkedin.png'))
      expect(results['og-instagram']).toBe(join(OUTPUT_DIR, 'og-instagram.png'))

      // Verify files exist and have the correct dimensions
      const facebookMeta = await sharp(results['og-facebook']).metadata()
      expect(facebookMeta.width).toBe(1200)
      expect(facebookMeta.height).toBe(630)

      const twitterMeta = await sharp(results['og-twitter']).metadata()
      expect(twitterMeta.width).toBe(1200)
      expect(twitterMeta.height).toBe(600)

      const instagramMeta = await sharp(results['og-instagram']).metadata()
      expect(instagramMeta.width).toBe(1080)
      expect(instagramMeta.height).toBe(1080)
    })

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

      // Lower quality should produce smaller files
      const lowQualitySize = (await Bun.file(results['og-twitter']).size())
      const highQualitySize = (await Bun.file(highQualityResults['og-twitter']).size())

      expect(lowQualitySize).toBeLessThan(highQualitySize)
    })
  })
})
