import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { Buffer } from 'node:buffer'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { applyWatermark } from '../src/processor'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('watermark', () => {
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

  describe('applyWatermark', () => {
    it('should apply text watermark to an image', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const output = join(OUTPUT_DIR, 'watermarked-text.png')

      const result = await applyWatermark(input, {
        output,
        text: 'Copyright 2023',
        position: 'bottom-right',
        opacity: 0.7,
        textOptions: {
          fontSize: 24,
          color: 'rgba(255, 255, 255, 0.8)',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: 10,
        },
      })

      expect(result.outputPath).toBe(output)
      expect(result.watermarkType).toBe('text')
      expect(result.dimensions.width).toBeGreaterThan(0)
      expect(result.dimensions.height).toBeGreaterThan(0)

      // Ensure file exists
      const exists = await Bun.file(output).exists()
      expect(exists).toBe(true)

      // Verify the image dimensions
      const metadata = await sharp(output).metadata()
      expect(metadata.width).toBe(result.dimensions.width)
      expect(metadata.height).toBe(result.dimensions.height)
    })

    it('should apply image watermark to an image', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const watermarkImage = join(FIXTURES_DIR, 'app-icon.png') // Using the same image as watermark for testing
      const output = join(OUTPUT_DIR, 'watermarked-image.png')

      const result = await applyWatermark(input, {
        output,
        image: watermarkImage,
        position: 'center',
        opacity: 0.3,
        scale: 0.5, // 50% of original image
      })

      expect(result.outputPath).toBe(output)
      expect(result.watermarkType).toBe('image')

      // Ensure file exists
      const exists = await Bun.file(output).exists()
      expect(exists).toBe(true)
    })

    it('should apply rotated text watermark', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const output = join(OUTPUT_DIR, 'watermarked-rotated.png')

      const result = await applyWatermark(input, {
        output,
        text: 'Rotated Text',
        position: 'center',
        rotate: 45,
        opacity: 0.8,
      })

      expect(result.outputPath).toBe(output)

      // Ensure file exists
      const exists = await Bun.file(output).exists()
      expect(exists).toBe(true)
    })

    it('should use default output path when not specified', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const result = await applyWatermark(input, {
        text: 'Default Output',
      })

      expect(result.outputPath).toContain('.watermarked.png')

      // Ensure file exists
      const exists = await Bun.file(result.outputPath).exists()
      expect(exists).toBe(true)
    })

    it('should throw error when neither text nor image is provided', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      await expect(applyWatermark(input, {})).rejects.toThrow('Either text or image must be provided')
    })

    it('should work with input as buffer', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const buffer = await Bun.file(input).arrayBuffer()
      const output = join(OUTPUT_DIR, 'buffer-watermarked.png')

      const result = await applyWatermark(Buffer.from(buffer), {
        output,
        text: 'From Buffer',
      })

      expect(result.inputPath).toBe('buffer')
      expect(result.outputPath).toBe(output)

      // Ensure file exists
      const exists = await Bun.file(output).exists()
      expect(exists).toBe(true)
    })
  })
})
