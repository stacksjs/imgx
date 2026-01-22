import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { process, processMultiple } from '../src/core'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('core', () => {
  beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true })
  })

  afterAll(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
  })

  afterEach(async () => {
    // Clean up output files between tests
    await rm(OUTPUT_DIR, { recursive: true, force: true })
      .catch(() => {})
    await mkdir(OUTPUT_DIR, { recursive: true })
  })

  describe('process', () => {
    it('should process an image file', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const output = join(OUTPUT_DIR, 'output.webp')

      const result = await process({
        input,
        output,
        format: 'webp',
        quality: 80,
      })

      expect(result.inputPath).toBe(input)
      expect(result.outputPath).toBe(output)
      expect(result.inputSize).toBeGreaterThan(0)
      expect(result.outputSize).toBeGreaterThan(0)
      // Note: Pure TS WebP encoder uses lossless, which may produce larger files
      // saved and savedPercentage can be negative when converting to WebP lossless
      expect(typeof result.saved).toBe('number')
      expect(typeof result.savedPercentage).toBe('number')

      // Verify the output file exists
      const metadata = await sharp(output).metadata()
      expect(metadata.format).toBe('webp')
    })

    it('should process an SVG file', async () => {
      // Create a simple SVG for testing
      const svgContent = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
        <!-- This is a comment that should be removed -->
      </svg>`
      const input = join(OUTPUT_DIR, 'input.svg')
      const output = join(OUTPUT_DIR, 'output.svg')

      await Bun.write(input, svgContent)

      const result = await process({
        input,
        output,
        removeComments: true,
      })

      expect(result.inputPath).toBe(input)
      expect(result.outputPath).toBe(output)
      expect(result.inputSize).toBeGreaterThan(0)
      expect(result.outputSize).toBeGreaterThan(0)

      // Verify the output SVG doesn't contain the comment
      const outputContent = await Bun.file(output).text()
      expect(outputContent).not.toContain('This is a comment')
    })

    it('should throw error for unsupported file extension', async () => {
      const input = join(OUTPUT_DIR, 'file.txt')
      await Bun.write(input, 'This is not an image')

      await expect(process({
        input,
        output: join(OUTPUT_DIR, 'output.jpg'),
      })).rejects.toThrow('Unsupported file extension: .txt')
    })
  })

  describe('processMultiple', () => {
    it('should process multiple files', async () => {
      // Create test files
      const input1 = join(FIXTURES_DIR, 'app-icon.png')
      const input2 = join(OUTPUT_DIR, 'test.jpg')

      // Create a simple JPEG
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      }).jpeg().toFile(input2)

      const results = await processMultiple(
        [input1, input2],
        { quality: 70 },
      )

      expect(results.length).toBe(2)
      expect(results[0].inputPath).toBe(input1)
      expect(results[1].inputPath).toBe(input2)
      expect(results.every(r => !r.error)).toBe(true)
    })

    it('should handle errors in individual files', async () => {
      const input1 = join(FIXTURES_DIR, 'app-icon.png')
      const input2 = join(OUTPUT_DIR, 'invalid.txt')

      await Bun.write(input2, 'Not an image')

      const results = await processMultiple(
        [input1, input2],
        { quality: 70 },
      )

      expect(results.length).toBe(2)
      expect(results[0].error).toBeUndefined()
      expect(results[1].error).toBeDefined()
    })
  })
})
