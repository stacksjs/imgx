import { describe, expect, it } from 'bun:test'
import {
  imageToSplatHash,
  rgbaToSplatHash,
  splatHashFromBase64,
  splatHashToBase64,
  splatHashToDataURL,
  splatHashToRgba,
} from '../src/splathash'

/** Build a simple synthetic RGBA image: left half red, right half blue. */
function twoTone(w: number, h: number): { data: Uint8Array, width: number, height: number, hasAlpha: boolean, bitDepth: number, colorSpace: string } {
  const data = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const left = x < w / 2
      data[i] = left ? 200 : 30
      data[i + 1] = 40
      data[i + 2] = left ? 30 : 200
      data[i + 3] = 255
    }
  }
  return { data, width: w, height: h, hasAlpha: false, bitDepth: 8, colorSpace: 'srgb' }
}

describe('splathash', () => {
  it('encodes any image to exactly 16 bytes', () => {
    const img = twoTone(120, 80)
    const hash = rgbaToSplatHash(img.data, img.width, img.height)
    expect(hash).toBeInstanceOf(Uint8Array)
    expect(hash.length).toBe(16)
  })

  it('round-trips through base64 losslessly (24 chars)', () => {
    const img = twoTone(64, 64)
    const hash = rgbaToSplatHash(img.data, img.width, img.height)
    const b64 = splatHashToBase64(hash)
    expect(b64.length).toBe(24)
    const back = splatHashFromBase64(b64)
    expect([...back]).toEqual([...hash])
  })

  it('decodes to a 32x32 opaque preview', () => {
    const img = twoTone(200, 100)
    const hash = imageToSplatHash(img as any)
    const preview = splatHashToRgba(hash)
    expect(preview.width).toBe(32)
    expect(preview.height).toBe(32)
    expect(preview.rgba.length).toBe(32 * 32 * 4)
    for (let i = 3; i < preview.rgba.length; i += 4) expect(preview.rgba[i]).toBe(255)
  })

  it('preserves left/right colour dominance in the preview', () => {
    // Left half is red-dominant, right half blue-dominant. The preview should
    // reflect that gross layout even at 16 bytes.
    const img = twoTone(160, 120)
    const preview = splatHashToRgba(rgbaToSplatHash(img.data, img.width, img.height))
    const sample = (px: number, py: number) => {
      const i = (py * 32 + px) * 4
      return { r: preview.rgba[i], b: preview.rgba[i + 2] }
    }
    const left = sample(6, 16)
    const right = sample(25, 16)
    expect(left.r).toBeGreaterThan(left.b)
    expect(right.b).toBeGreaterThan(right.r)
  })

  it('produces a usable BMP data URL placeholder', () => {
    const hash = rgbaToSplatHash(twoTone(64, 64).data, 64, 64)
    const url = splatHashToDataURL(hash)
    expect(url.startsWith('data:image/bmp;base64,')).toBe(true)
    expect(url.length).toBeGreaterThan(100)
  })

  it('rejects malformed hashes', () => {
    expect(() => splatHashToRgba(new Uint8Array(15))).toThrow(/16 bytes/)
  })
})
