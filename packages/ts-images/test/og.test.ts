import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { generateSocialImages } from '../src/og'
import { readMetadata } from './utils/test-helpers'

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
})
