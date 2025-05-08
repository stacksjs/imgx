import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import {
  batchProcessImages,
  convertImageFormat,
  generatePlaceholder,
  optimizeImage,
} from '../src/processor'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('processor', () => {
  beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true })
    await mkdir(join(OUTPUT_DIR, 'batch-test'), { recursive: true })
  })

  afterAll(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
  })

  afterEach(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
      .catch(() => {})
    await mkdir(OUTPUT_DIR, { recursive: true })
    await mkdir(join(OUTPUT_DIR, 'batch-test'), { recursive: true })
  })

  describe('optimizeImage', () => {
    it('should optimize an image', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const output = join(OUTPUT_DIR, 'optimized.png')

      const result = await optimizeImage(input, output)

      expect(result.success).toBe(true)
      expect(result.outputPath).toBe(output)
      expect(result.originalSize).toBeGreaterThan(0)
      expect(result.optimizedSize).toBeGreaterThan(0)
      expect(result.optimizedSize).toBeLessThan(result.originalSize)

      // Ensure the file exists
      const exists = await Bun.file(output).exists()
      expect(exists).toBe(true)
    })
  })

  describe('generatePlaceholder', () => {
    it('should generate a base64 blurred placeholder', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const result = await generatePlaceholder(input, {
        width: 20,
        quality: 60,
        strategy: 'blur',
      })

      expect(result.dataURL).toContain('data:image/webp;base64,')
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
      expect(result.aspectRatio).toBeGreaterThan(0)
      expect(result.strategy).toBe('blur')
      expect(result.originalWidth).toBeGreaterThan(0)
      expect(result.originalHeight).toBeGreaterThan(0)
    })

    it('should generate a thumbhash placeholder', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const result = await generatePlaceholder(input, {
        strategy: 'thumbhash',
      })

      expect(result.dataURL).toContain('data:image/png;base64,')
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
      expect(result.aspectRatio).toBeGreaterThan(0)
      expect(result.strategy).toBe('thumbhash')
    })

    it('should generate a pixelated placeholder', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const result = await generatePlaceholder(input, {
        width: 30,
        strategy: 'pixelate',
        quality: 70,
      })

      expect(result.dataURL).toContain('data:image/webp;base64,')
      expect(result.strategy).toBe('pixelate')
    })

    it('should generate a dominant color placeholder', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const result = await generatePlaceholder(input, {
        strategy: 'dominant-color',
      })

      expect(result.dataURL).toContain('data:image/svg+xml')
      expect(result.dominantColor).toMatch(/rgb\(\d+, \d+, \d+\)/)
      expect(result.strategy).toBe('dominant-color')
    })

    it('should generate placeholder with CSS', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const result = await generatePlaceholder(input, {
        width: 20,
        strategy: 'blur',
        cssFilter: true,
      })

      expect(result.css).toBeDefined()
      expect(result.css).toContain('.placeholder-image')
      expect(result.css).toContain('filter: blur(20px)')
    })

    it('should generate a file placeholder when base64Encode is false', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const result = await generatePlaceholder(input, {
        base64Encode: false,
        format: 'jpeg',
        outputPath: join(OUTPUT_DIR, 'custom-placeholder.jpeg'),
      })

      expect(result.dataURL).toContain('custom-placeholder.jpeg')
      expect(result.width).toBeGreaterThan(0)

      // Check if file exists
      const exists = await Bun.file(result.dataURL).exists()
      expect(exists).toBe(true)
    })
  })

  describe('convertImageFormat', () => {
    it('should convert an image to webp format', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const result = await convertImageFormat(input, 'webp', {
        outputDir: OUTPUT_DIR,
        quality: 90,
      })

      expect(result.outputPath).toContain('.webp')
      expect(result.format).toBe('webp')
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
      expect(result.saved).toBeGreaterThanOrEqual(0)
      expect(result.originalSize).toBeGreaterThan(0)
      expect(result.convertedSize).toBeGreaterThan(0)

      // Check if file exists
      const exists = await Bun.file(result.outputPath).exists()
      expect(exists).toBe(true)

      // Verify the format
      const metadata = await sharp(result.outputPath).metadata()
      expect(metadata.format).toBe('webp')
    })

    it('should convert an image to jpeg format with custom options', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const result = await convertImageFormat(input, 'jpeg', {
        outputDir: OUTPUT_DIR,
        quality: 85,
        progressive: true,
        filenamePrefix: 'converted-',
        filenameSuffix: '-high',
        chromaSubsampling: '4:4:4',
      })

      expect(result.outputPath).toContain('converted-app-icon-high.jpeg')
      expect(result.format).toBe('jpeg')

      // Check if file exists
      const exists = await Bun.file(result.outputPath).exists()
      expect(exists).toBe(true)

      // Verify the format
      const metadata = await sharp(result.outputPath).metadata()
      expect(metadata.format).toBe('jpeg')
    })

    it('should convert and resize an image', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const result = await convertImageFormat(input, 'webp', {
        outputDir: OUTPUT_DIR,
        quality: 90,
        resize: { width: 200, height: 200 },
      })

      // Verify the dimensions
      const metadata = await sharp(result.outputPath).metadata()
      expect(metadata.width).toBe(200)
      expect(metadata.height).toBe(200)
    })
  })

  describe('batchProcessImages', () => {
    it('should batch process images in a directory', async () => {
      // Create a few test images in the batch-test directory
      const testImages = ['test1.png', 'test2.png', 'test3.jpg']

      for (const filename of testImages) {
        const filepath = join(OUTPUT_DIR, 'batch-test', filename)

        // Create a simple test image
        await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 },
          },
        }).toFile(filepath)
      }

      // Process the test directory
      const batchDir = join(OUTPUT_DIR, 'batch-test')
      const result = await batchProcessImages(batchDir, {
        formats: ['webp', 'jpeg'],
        quality: 80,
        resize: { width: 50 },
      })

      expect(result.results.length).toBe(testImages.length)
      expect(result.summary.totalFiles).toBe(testImages.length)
      expect(result.summary.successCount).toBe(testImages.length)
      expect(result.summary.errorCount).toBe(0)
      expect(result.summary.timeElapsed).toBeGreaterThan(0)

      // Verify that saved percentage is calculated
      expect(result.summary.savedPercentage).toBeGreaterThanOrEqual(0)

      // All should be successful
      expect(result.results.every(r => r.success)).toBe(true)

      // Each result should have two outputs (webp and jpeg)
      for (const fileResult of result.results) {
        expect(fileResult.outputs.length).toBe(2)

        // Verify the outputs exist
        for (const output of fileResult.outputs) {
          const exists = await Bun.file(output.path).exists()
          expect(exists).toBe(true)
          expect(output.size).toBeGreaterThan(0)
          expect(output.format).toMatch(/webp|jpeg/)
        }
      }
    })

    it('should filter images based on the filter option', async () => {
      // Create a few test files in the batch-test directory
      const testFiles = ['test1.png', 'test2.txt', 'test3.jpg', 'test4.psd']

      for (const filename of testFiles) {
        const filepath = join(OUTPUT_DIR, 'batch-test', filename)

        if (filename.endsWith('.png') || filename.endsWith('.jpg')) {
          // Create a real image for image files
          await sharp({
            create: {
              width: 50,
              height: 50,
              channels: 4,
              background: { r: 0, g: 255, b: 0, alpha: 1 },
            },
          }).toFile(filepath)
        }
        else {
          // Create empty files for non-images
          await writeFile(filepath, '')
        }
      }

      // Process the test directory with png filter
      const batchDir = join(OUTPUT_DIR, 'batch-test')
      const result = await batchProcessImages(batchDir, {
        formats: ['webp'],
        filter: /\.png$/i,
      })

      // Should only process PNG files
      expect(result.results.length).toBe(1)
      expect(result.results[0].input).toContain('test1.png')
      expect(result.summary.totalFiles).toBe(1)
    })

    it('should use custom filename templates', async () => {
      // Create a test image
      const filepath = join(OUTPUT_DIR, 'batch-test', 'original.jpg')
      await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 4,
          background: { r: 255, g: 200, b: 0, alpha: 1 },
        },
      }).toFile(filepath)

      // Process with custom template
      const batchDir = join(OUTPUT_DIR, 'batch-test')
      const result = await batchProcessImages(batchDir, {
        formats: ['webp'],
        quality: 75,
        filenameTemplate: '[name]-[width]x[height]-q[quality].[format]',
      })

      expect(result.results.length).toBe(1)
      expect(result.results[0].outputs.length).toBe(1)

      // Check filename follows template
      const outputPath = result.results[0].outputs[0].path
      expect(outputPath).toContain('original-200x150-q75.webp')

      // Ensure file exists
      const exists = await Bun.file(outputPath).exists()
      expect(exists).toBe(true)
    })

    it('should apply transformations to images', async () => {
      // Create a test image
      const filepath = join(OUTPUT_DIR, 'batch-test', 'transform.jpg')
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      }).toFile(filepath)

      // Process with transformations
      const batchDir = join(OUTPUT_DIR, 'batch-test')
      const result = await batchProcessImages(batchDir, {
        formats: ['webp'],
        transformations: [
          { type: 'grayscale' },
          { type: 'blur', options: { sigma: 5 } },
        ],
      })

      expect(result.results.length).toBe(1)
      expect(result.results[0].success).toBe(true)

      // Check the output file to verify transformations were applied
      const outputPath = result.results[0].outputs[0].path
      const metadata = await sharp(outputPath).metadata()

      // File should exist with expected format
      expect(metadata.format).toBe('webp')
    })

    it('should track progress with a callback', async () => {
      // Create test images
      const testImages = ['progress1.png', 'progress2.jpg']

      for (const filename of testImages) {
        const filepath = join(OUTPUT_DIR, 'batch-test', filename)
        await sharp({
          create: {
            width: 50,
            height: 50,
            channels: 4,
            background: { r: 100, g: 150, b: 200, alpha: 1 },
          },
        }).toFile(filepath)
      }

      // Track progress with a callback
      const progressUpdates: any[] = []

      const result = await batchProcessImages(join(OUTPUT_DIR, 'batch-test'), {
        formats: ['webp'],
        progressCallback: (progress) => {
          progressUpdates.push({ ...progress })
        },
      })

      // We should have received 2 progress updates (one per file)
      expect(progressUpdates.length).toBe(2)

      // Verify progress report format
      expect(progressUpdates[0].completed).toBe(1)
      expect(progressUpdates[1].completed).toBe(2)
      expect(progressUpdates[1].total).toBe(2)
      expect(progressUpdates[1].percentage).toBe(100)
      expect(progressUpdates[1].success).toBe(true)

      // Verify the process completed
      expect(result.summary.successCount).toBe(2)
    })
  })
})
