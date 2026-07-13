import { describe, expect, it } from 'bun:test'
import { decode, encode } from '../src/codecs'
import { applyExifOrientation, jpegExifOrientation } from '../src/core/exif'
import { createImageData } from '../src/core/image-data'

/**
 * Build an APP1 Exif segment carrying only the orientation tag, and splice
 * it into a real JPEG right after SOI. Big-endian TIFF ("MM").
 */
function withExifOrientation(jpeg: Uint8Array, orientation: number): Uint8Array {
  const tiff = [
    0x4D, 0x4D, // "MM" big-endian
    0x00, 0x2A, // 42
    0x00, 0x00, 0x00, 0x08, // IFD0 offset
    0x00, 0x01, // 1 entry
    0x01, 0x12, // tag 0x0112 orientation
    0x00, 0x03, // type SHORT
    0x00, 0x00, 0x00, 0x01, // count 1
    0x00, orientation, 0x00, 0x00, // value (left-justified in 4 bytes)
    0x00, 0x00, 0x00, 0x00, // next IFD offset
  ]
  const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff] // "Exif\0\0" + TIFF
  const segLen = payload.length + 2
  const app1 = [0xFF, 0xE1, (segLen >> 8) & 0xFF, segLen & 0xFF, ...payload]

  const out = new Uint8Array(jpeg.length + app1.length)
  out.set(jpeg.subarray(0, 2), 0) // SOI
  out.set(app1, 2)
  out.set(jpeg.subarray(2), 2 + app1.length)
  return out
}

/** A 2x1 image: red pixel on the left, blue pixel on the right. */
function redBlue(): ReturnType<typeof createImageData> {
  const img = createImageData(2, 1)
  img.data.set([255, 0, 0, 255, 0, 0, 255, 255])
  return img
}

describe('jpegExifOrientation', () => {
  it('returns 1 for a JPEG without EXIF', async () => {
    const jpeg = await encode(redBlue(), 'jpeg', { quality: 90 })
    expect(jpegExifOrientation(jpeg)).toBe(1)
  })

  it('reads the orientation tag from an APP1 segment', async () => {
    const jpeg = await encode(redBlue(), 'jpeg', { quality: 90 })
    for (const orientation of [1, 3, 6, 8]) {
      expect(jpegExifOrientation(withExifOrientation(jpeg, orientation))).toBe(orientation)
    }
  })

  it('returns 1 for garbage buffers', () => {
    expect(jpegExifOrientation(new Uint8Array([1, 2, 3]))).toBe(1)
    expect(jpegExifOrientation(new Uint8Array(0))).toBe(1)
  })
})

describe('applyExifOrientation', () => {
  it('rotates dimensions for the rotated orientations', () => {
    const img = createImageData(4, 2)
    for (const o of [5, 6, 7, 8]) {
      const out = applyExifOrientation(img, o)
      expect([out.width, out.height]).toEqual([2, 4])
    }
    for (const o of [1, 2, 3, 4]) {
      const out = applyExifOrientation(img, o)
      expect([out.width, out.height]).toEqual([4, 2])
    }
  })

  it('orientation 6 puts the left pixel on top', () => {
    // Stored sensor row [red, blue] with orientation 6 (rotate 90 CW to
    // display) must render red above blue.
    const out = applyExifOrientation(redBlue(), 6)
    expect([out.width, out.height]).toEqual([1, 2])
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([255, 0, 0]) // top = red
    expect([out.data[4], out.data[5], out.data[6]]).toEqual([0, 0, 255]) // bottom = blue
  })

  it('orientation 3 reverses the row', () => {
    const out = applyExifOrientation(redBlue(), 3)
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([0, 0, 255])
    expect([out.data[4], out.data[5], out.data[6]]).toEqual([255, 0, 0])
  })
})

describe('decode applies orientation', () => {
  it('auto-uprights a tagged JPEG and can opt out', async () => {
    const jpeg = withExifOrientation(await encode(redBlue(), 'jpeg', { quality: 100 }), 6)

    const upright = await decode(jpeg)
    expect([upright.width, upright.height]).toEqual([1, 2])

    const raw = await decode(jpeg, { applyOrientation: false })
    expect([raw.width, raw.height]).toEqual([2, 1])
  })
})
