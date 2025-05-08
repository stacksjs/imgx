import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { generateFavicons } from '../src/favicon'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('favicon', () => {
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

  describe('generateFavicons', () => {
    it('should generate favicons in multiple sizes', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const results = await generateFavicons(input, OUTPUT_DIR)

      expect(results.length).toBeGreaterThan(0)

      // Check if the .ico file was generated
      const icoExists = await Bun.file(join(OUTPUT_DIR, 'favicon.ico')).exists()
      expect(icoExists).toBe(true)

      // Check if the PNG favicons were generated
      const pngExists = await Bun.file(join(OUTPUT_DIR, 'favicon-32x32.png')).exists()
      expect(pngExists).toBe(true)

      // Verify dimensions of a favicon
      const metadata = await sharp(join(OUTPUT_DIR, 'favicon-32x32.png')).metadata()
      expect(metadata.width).toBe(32)
      expect(metadata.height).toBe(32)
    })
  })
})
