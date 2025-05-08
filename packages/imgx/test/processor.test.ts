import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { processImage, processSvg } from '../src/processor'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('processor', () => {
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

  describe('processImage', () => {
    it('should process image with string input', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const output = join(OUTPUT_DIR, 'processed.webp')

      const result = await processImage({
        input,
        output,
        format: 'webp',
        quality: 80,
      })

      expect(result.inputPath).toBe(input)
      expect(result.outputPath).toBe(output)
      expect(result.inputSize).toBeGreaterThan(0)
      expect(result.outputSize).toBeGreaterThan(0)
      expect(result.saved).toBeGreaterThan(0)

      // Verify output
      const metadata = await sharp(output).metadata()
      expect(metadata.format).toBe('webp')
    })

    it('should process image with buffer input', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const buffer = await Bun.file(input).arrayBuffer()
      const output = join(OUTPUT_DIR, 'processed.jpg')

      const result = await processImage({
        input: Buffer.from(buffer),
        output,
        format: 'jpeg',
        quality: 85,
        progressive: true,
      })

      expect(result.inputPath).toBe('buffer')
      expect(result.outputPath).toBe(output)
      expect(result.inputSize).toBeGreaterThan(0)
      expect(result.outputSize).toBeGreaterThan(0)

      // Verify output
      const metadata = await sharp(output).metadata()
      expect(metadata.format).toBe('jpeg')
      expect(metadata.isProgressive).toBe(true)
    })

    it('should resize an image', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const output = join(OUTPUT_DIR, 'resized.png')

      const result = await processImage({
        input,
        output,
        resize: { width: 200, height: 200 },
      })

      const metadata = await sharp(output).metadata()
      expect(metadata.width).toBe(200)
      expect(metadata.height).toBe(200)
    })
  })

  describe('processSvg', () => {
    it('should optimize SVG', async () => {
      const svgContent = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
        <!-- This is a comment that should be removed -->
      </svg>`

      const input = join(OUTPUT_DIR, 'input.svg')
      const output = join(OUTPUT_DIR, 'output.svg')

      await Bun.write(input, svgContent)

      const result = await processSvg({
        input,
        output,
        cleanup: true,
        removeComments: true,
      })

      expect(result.inputPath).toBe(input)
      expect(result.outputPath).toBe(output)

      // Check that comments were removed
      const outputContent = await Bun.file(output).text()
      expect(outputContent).not.toContain('This is a comment')
    })

    it('should process SVG with buffer input', async () => {
      const svgContent = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
      </svg>`

      const buffer = Buffer.from(svgContent, 'utf-8')
      const output = join(OUTPUT_DIR, 'output.svg')

      const result = await processSvg({
        input: buffer,
        output,
        prettify: true,
      })

      expect(result.inputPath).toBe('buffer')
      expect(result.outputPath).toBe(output)

      // Check that the output exists
      const outputContent = await Bun.file(output).text()
      expect(outputContent).toContain('<circle')
    })
  })
})
