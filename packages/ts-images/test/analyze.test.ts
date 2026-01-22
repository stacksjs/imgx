import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { analyzeImage, generateReport } from '../src/analyze'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('analyze', () => {
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

  describe('analyzeImage', () => {
    it('should analyze a PNG image', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const stats = await analyzeImage(input)

      expect(stats.path).toBe(input)
      expect(stats.format).toBe('png')
      expect(stats.width).toBeGreaterThan(0)
      expect(stats.height).toBeGreaterThan(0)
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.aspectRatio).toBeCloseTo(stats.width / stats.height)
      expect(typeof stats.optimizationPotential).toBe('string')
    })

    it('should analyze a JPEG image', async () => {
      // Create a test JPEG
      const output = join(OUTPUT_DIR, 'test.jpg')
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      }).jpeg().toFile(output)

      const stats = await analyzeImage(output)

      expect(stats.format).toBe('jpeg')
      expect(stats.width).toBe(100)
      expect(stats.height).toBe(100)
      expect(stats.aspectRatio).toBe(1)
      expect(stats.hasAlpha).toBe(false)
    })

    it('should flag large images as having high optimization potential', async () => {
      // Create a large unoptimized image
      const output = join(OUTPUT_DIR, 'large.png')
      await sharp({
        create: {
          width: 3000,
          height: 3000,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      }).png({ quality: 100 }).toFile(output)

      const stats = await analyzeImage(output)

      expect(stats.optimizationPotential).toBe('high')
      expect(stats.warnings).toContain('Image dimensions are very large')
    })
  })

  describe('generateReport', () => {
    it('should generate a report for multiple images', async () => {
      // Create test images
      const output1 = join(OUTPUT_DIR, 'test1.jpg')
      const output2 = join(OUTPUT_DIR, 'test2.png')

      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      }).jpeg().toFile(output1)

      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      }).png().toFile(output2)

      const report = await generateReport([output1, output2])

      expect(report.stats.length).toBe(2)
      expect(report.summary.totalImages).toBe(2)
      expect(report.summary.totalSize).toBeGreaterThan(0)
      expect(report.summary.formatBreakdown).toHaveProperty('jpeg', 1)
      expect(report.summary.formatBreakdown).toHaveProperty('png', 1)
      expect(report.summary.potentialSavings).toMatch(/\d+KB/)
    })
  })
})
