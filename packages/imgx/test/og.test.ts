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

      // Make smaller test image for faster processing
      const smallerInput = join(OUTPUT_DIR, 'smaller-test.png')
      await sharp(input)
        .resize(300) // Make it smaller for faster processing
        .toFile(smallerInput)

      // Ensure output directory exists
      await mkdir(OUTPUT_DIR, { recursive: true })

      const results = await generateSocialImages(smallerInput, OUTPUT_DIR)

      // Check all standard OG images were created
      expect(results['og-github']).toBe(join(OUTPUT_DIR, 'og-github.png'))
      expect(results['og-facebook']).toBe(join(OUTPUT_DIR, 'og-facebook.png'))
      expect(results['og-twitter']).toBe(join(OUTPUT_DIR, 'og-twitter.png'))
      expect(results['og-linkedin']).toBe(join(OUTPUT_DIR, 'og-linkedin.png'))
      expect(results['og-instagram']).toBe(join(OUTPUT_DIR, 'og-instagram.png'))

      // Verify files exist
      for (const path of Object.values(results)) {
        const exists = await Bun.file(path).exists()
        expect(exists).toBe(true)
      }

      // Verify dimensions of a sample file
      const facebookMeta = await sharp(results['og-facebook']).metadata()
      expect(facebookMeta.width).toBe(1200)
      expect(facebookMeta.height).toBe(630)

      // Verify one more to ensure processing worked correctly
      const twitterMeta = await sharp(results['og-twitter']).metadata()
      expect(twitterMeta.width).toBe(1200)
      expect(twitterMeta.height).toBe(600)
    }, 15000) // Increase timeout to 15 seconds

    it('should apply quality options', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      // Make smaller test image for faster processing
      const smallerInput = join(OUTPUT_DIR, 'smaller-test.png')
      await sharp(input)
        .resize(300) // Make it smaller for faster processing
        .toFile(smallerInput)

      // Generate with lower quality
      const results = await generateSocialImages(smallerInput, OUTPUT_DIR, {
        quality: 60,
      })

      // Generate with higher quality for comparison
      const highQualityDir = join(OUTPUT_DIR, 'high-quality')
      await mkdir(highQualityDir, { recursive: true })

      const highQualityResults = await generateSocialImages(smallerInput, highQualityDir, {
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

      // Lower quality should produce smaller files
      const lowQualityFileInfo = await Bun.file(results['og-twitter']).stat()
      const highQualityFileInfo = await Bun.file(highQualityResults['og-twitter']).stat()

      expect(lowQualityFileInfo.size).toBeLessThan(highQualityFileInfo.size)
    }, 15000) // Increase timeout to 15 seconds
  })
})
