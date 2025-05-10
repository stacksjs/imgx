import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { generateImageSet, generateResponsiveImages } from '../src/responsive'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('responsive', () => {
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

  describe('generateResponsiveImages', () => {
    it('should generate responsive images in multiple sizes and formats', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const result = await generateResponsiveImages({
        input,
        breakpoints: [200, 400, 800],
        formats: ['webp', 'jpeg'],
        outputDir: OUTPUT_DIR,
        quality: 80,
      })

      expect(result.original).toBe(input)
      expect(result.variants.length).toBe(6) // 3 sizes × 2 formats
      expect(result.srcset.webp).toBeDefined()
      expect(result.srcset.jpeg).toBeDefined()
      expect(result.htmlMarkup).toContain('<picture>')

      // Check that files exist
      for (const variant of result.variants) {
        const exists = await Bun.file(variant.path).exists()
        expect(exists).toBe(true)

        // Verify file dimensions
        const metadata = await sharp(variant.path).metadata()
        expect(metadata.width).toBe(variant.width)
      }
    })
  })

  describe('generateImageSet', () => {
    it('should generate an image set with custom sizes', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const results = await generateImageSet({
        input,
        name: 'test',
        sizes: [
          { width: 100, suffix: 'small' },
          { width: 200, height: 150, suffix: 'medium' },
          { width: 300, suffix: 'large' },
        ],
        outputDir: OUTPUT_DIR,
        format: 'webp',
        quality: 90,
      })

      expect(results.length).toBe(3)

      // Check files exist with correct dimensions
      const smallImg = join(OUTPUT_DIR, 'test-small.webp')
      const mediumImg = join(OUTPUT_DIR, 'test-medium.webp')
      const largeImg = join(OUTPUT_DIR, 'test-large.webp')

      expect(await Bun.file(smallImg).exists()).toBe(true)
      expect(await Bun.file(mediumImg).exists()).toBe(true)
      expect(await Bun.file(largeImg).exists()).toBe(true)

      // Verify dimensions
      expect((await sharp(smallImg).metadata()).width).toBe(100)

      const mediumMetadata = await sharp(mediumImg).metadata()
      expect(mediumMetadata.width).toBe(200)
      expect(mediumMetadata.height).toBe(150)

      expect((await sharp(largeImg).metadata()).width).toBe(300)
    })
  })
})
