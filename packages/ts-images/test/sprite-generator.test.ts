import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { generateSprite } from '../src/sprite-generator'

// const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('sprite-generator', () => {
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

  describe('generateSprite', () => {
    it('should generate a sprite sheet with CSS', async () => {
      // Create test images for the sprite
      const img1Path = join(OUTPUT_DIR, 'icon1.png')
      const img2Path = join(OUTPUT_DIR, 'icon2.png')

      // Create 2 simple square images
      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      }).png().toFile(img1Path)

      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      }).png().toFile(img2Path)

      const result = await generateSprite(
        [
          { path: img1Path, name: 'icon1' },
          { path: img2Path, name: 'icon2' },
        ],
        OUTPUT_DIR,
        {
          prefix: 'test',
          format: 'png',
          padding: 2,
        },
      )

      expect(result.imagePath).toBe(join(OUTPUT_DIR, 'test-sprite.png'))
      expect(result.cssPath).toBe(join(OUTPUT_DIR, 'test-sprite.css'))
      expect(result.sprites.length).toBe(2)

      // Check if files exist
      expect(await Bun.file(result.imagePath).exists()).toBe(true)
      expect(await Bun.file(result.cssPath).exists()).toBe(true)
      expect(await Bun.file(join(OUTPUT_DIR, 'test-sprite.scss')).exists()).toBe(true)

      // Check CSS content
      const cssContent = await Bun.file(result.cssPath).text()
      expect(cssContent).toContain('.test-icon1')
      expect(cssContent).toContain('.test-icon2')

      // Check SCSS content
      const scssContent = await Bun.file(join(OUTPUT_DIR, 'test-sprite.scss')).text()
      expect(scssContent).toContain('$test-sprites')
      expect(scssContent).toContain('\'icon1\'')
      expect(scssContent).toContain('\'icon2\'')
    })

    it('should generate a sprite sheet with custom options', async () => {
      // Create a test image
      const imgPath = join(OUTPUT_DIR, 'icon.png')
      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      }).png().toFile(imgPath)

      const result = await generateSprite(
        [{ path: imgPath, name: 'icon' }],
        OUTPUT_DIR,
        {
          format: 'webp',
          quality: 90,
          scale: 0.5, // Downscale the images
        },
      )

      expect(result.imagePath).toBe(join(OUTPUT_DIR, 'sprite-sprite.webp'))

      // Check if sprite was created with correct format
      const metadata = await sharp(result.imagePath).metadata()
      expect(metadata.format).toBe('webp')

      // Scale factor should affect the sprite size
      const sprite = result.sprites[0]
      expect(sprite.width).toBe(25) // 50 * 0.5 = 25
      expect(sprite.height).toBe(25)
    })
  })
})
