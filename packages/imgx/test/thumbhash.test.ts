import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import {
  generateThumbHash,
  rgbaToDataURL,
  rgbaToThumbHash,
  thumbHashToApproximateAspectRatio,
  thumbHashToAverageRGBA,
  thumbHashToDataURL,
  thumbHashToRGBA,
} from '../src/thumbhash'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('thumbhash', () => {
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

  describe('rgbaToThumbHash', () => {
    it('should encode RGBA data to ThumbHash', () => {
      // Create a simple 2x2 red square
      const rgba = new Uint8Array([
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
      ])

      const hash = rgbaToThumbHash(2, 2, rgba)

      expect(hash).toBeInstanceOf(Uint8Array)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should throw an error for oversized images', () => {
      const rgba = new Uint8Array(101 * 101 * 4)

      expect(() => rgbaToThumbHash(101, 101, rgba)).toThrow()
    })
  })

  describe('thumbHashToRGBA', () => {
    it('should decode ThumbHash to RGBA data', () => {
      // First create a hash
      const rgba = new Uint8Array([
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
      ])

      const hash = rgbaToThumbHash(2, 2, rgba)

      // Now decode it
      const decoded = thumbHashToRGBA(hash)

      expect(decoded.w).toBeGreaterThan(0)
      expect(decoded.h).toBeGreaterThan(0)
      expect(decoded.rgba).toBeInstanceOf(Uint8Array)
      expect(decoded.rgba.length).toBe(decoded.w * decoded.h * 4)

      // Should be predominantly red
      const firstPixelR = decoded.rgba[0]
      expect(firstPixelR).toBeGreaterThan(200) // Should be close to 255 (red)
    })
  })

  describe('thumbHashToAverageRGBA', () => {
    it('should extract average color from ThumbHash', () => {
      // Create a simple red image
      const rgba = new Uint8Array([
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
        255,
        0,
        0,
        255, // Red pixel
      ])

      const hash = rgbaToThumbHash(2, 2, rgba)
      const avgColor = thumbHashToAverageRGBA(hash)

      expect(avgColor.r).toBeGreaterThan(0.8) // Close to 1.0 (red)
      expect(avgColor.g).toBeLessThan(0.2) // Close to 0 (no green)
      expect(avgColor.b).toBeLessThan(0.2) // Close to 0 (no blue)
      expect(avgColor.a).toBeCloseTo(1.0) // Fully opaque
    })
  })

  describe('thumbHashToApproximateAspectRatio', () => {
    it('should extract approximate aspect ratio from ThumbHash', () => {
      // Create a simple 2x2 square image
      const rgba = new Uint8Array(2 * 2 * 4).fill(255)
      const squareHash = rgbaToThumbHash(2, 2, rgba)

      // Create a 4x2 landscape image
      const landscapeRgba = new Uint8Array(4 * 2 * 4).fill(255)
      const landscapeHash = rgbaToThumbHash(4, 2, landscapeRgba)

      const squareRatio = thumbHashToApproximateAspectRatio(squareHash)
      const landscapeRatio = thumbHashToApproximateAspectRatio(landscapeHash)

      expect(Math.abs(squareRatio - 1.0)).toBeLessThan(0.5) // Should be close to 1.0
      expect(landscapeRatio).toBeGreaterThan(1.0) // Should be > 1.0 for landscape
    })
  })

  describe('rgbaToDataURL', () => {
    it('should convert RGBA data to a PNG data URL', () => {
      const rgba = new Uint8Array([
        255,
        0,
        0,
        255, // Red pixel
        0,
        255,
        0,
        255, // Green pixel
        0,
        0,
        255,
        255, // Blue pixel
        255,
        255,
        255,
        255, // White pixel
      ])

      const dataUrl = rgbaToDataURL(2, 2, rgba)

      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
      expect(dataUrl.length).toBeGreaterThan(50)
    })
  })

  describe('thumbHashToDataURL', () => {
    it('should convert ThumbHash to data URL directly', () => {
      const rgba = new Uint8Array(16 * 16 * 4).fill(128)
      const hash = rgbaToThumbHash(16, 16, rgba)

      const dataUrl = thumbHashToDataURL(hash)

      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    })
  })

  describe('generateThumbHash', () => {
    it('should generate ThumbHash from an image file', async () => {
      const input = join(FIXTURES_DIR, 'app-icon.png')

      const { hash, dataUrl } = await generateThumbHash(input)

      expect(hash).toBeInstanceOf(Uint8Array)
      expect(hash.length).toBeGreaterThan(0)
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    })
  })
})
