import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { generateAppIcons, generateIOSAppIcons, generateMacOSAppIcons } from '../src/app-icon'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('app-icon', () => {
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

  describe('generateMacOSAppIcons', () => {
    it('should generate macOS app icons', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const result = await generateMacOSAppIcons(input, OUTPUT_DIR)

      expect(result.platform).toBe('macos')
      expect(result.sizes.length).toBeGreaterThan(0)
      expect(result.contentsJson).toBeDefined()

      // Check if Contents.json exists
      const contentsJsonPath = join(OUTPUT_DIR, 'AppIcon.appiconset', 'Contents.json')
      const contentsJson = await Bun.file(contentsJsonPath).text()
      expect(contentsJson).toBeDefined()

      // Check if at least one icon was generated
      const firstIcon = result.sizes[0]
      const iconExists = await Bun.file(firstIcon.path).exists()
      expect(iconExists).toBe(true)

      // Check if README was generated
      const readmePath = join(OUTPUT_DIR, 'README.md')
      const readmeExists = await Bun.file(readmePath).exists()
      expect(readmeExists).toBe(true)
    })
  })

  describe('generateIOSAppIcons', () => {
    it('should generate iOS app icons', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')
      const result = await generateIOSAppIcons(input, OUTPUT_DIR)

      expect(result.platform).toBe('ios')
      expect(result.sizes.length).toBeGreaterThan(0)
      expect(result.contentsJson).toBeDefined()

      // Check if Contents.json exists
      const contentsJsonPath = join(OUTPUT_DIR, 'AppIcon.appiconset', 'Contents.json')
      const contentsJson = await Bun.file(contentsJsonPath).text()
      expect(contentsJson).toBeDefined()

      // Check if at least one icon was generated
      const firstIcon = result.sizes[0]
      const iconExists = await Bun.file(firstIcon.path).exists()
      expect(iconExists).toBe(true)
    })
  })

  describe('generateAppIcons', () => {
    it('should generate icons for specified platform', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const results = await generateAppIcons(input, {
        outputDir: OUTPUT_DIR,
        platform: 'macos',
      })

      expect(results.length).toBe(1)
      expect(results[0].platform).toBe('macos')
    })

    it('should generate icons for all platforms when specified', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const results = await generateAppIcons(input, {
        outputDir: OUTPUT_DIR,
        platform: 'all',
      })

      expect(results.length).toBe(2)
      expect(results.some(r => r.platform === 'macos')).toBe(true)
      expect(results.some(r => r.platform === 'ios')).toBe(true)
    })
  })
})
