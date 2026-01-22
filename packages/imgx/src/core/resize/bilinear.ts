import type { ImageData } from '../image-data'
import { createImageData, getPixel, setPixel } from '../image-data'

/**
 * Resize an image using bilinear interpolation
 * Fast algorithm with decent quality for most use cases
 */
export function resizeBilinear(
  src: ImageData,
  width: number,
  height: number,
): ImageData {
  const dst = createImageData(width, height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  const xRatio = src.width / width
  const yRatio = src.height / height

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate source position
      const srcX = x * xRatio
      const srcY = y * yRatio

      // Get integer and fractional parts
      const x0 = Math.floor(srcX)
      const y0 = Math.floor(srcY)
      const x1 = Math.min(x0 + 1, src.width - 1)
      const y1 = Math.min(y0 + 1, src.height - 1)

      const fx = srcX - x0
      const fy = srcY - y0

      // Get the four surrounding pixels
      const p00 = getPixel(src, x0, y0)
      const p10 = getPixel(src, x1, y0)
      const p01 = getPixel(src, x0, y1)
      const p11 = getPixel(src, x1, y1)

      // Bilinear interpolation
      const r = bilinearInterpolate(p00.r, p10.r, p01.r, p11.r, fx, fy)
      const g = bilinearInterpolate(p00.g, p10.g, p01.g, p11.g, fx, fy)
      const b = bilinearInterpolate(p00.b, p10.b, p01.b, p11.b, fx, fy)
      const a = bilinearInterpolate(p00.a, p10.a, p01.a, p11.a, fx, fy)

      setPixel(dst, x, y, { r, g, b, a })
    }
  }

  return dst
}

function bilinearInterpolate(
  p00: number,
  p10: number,
  p01: number,
  p11: number,
  fx: number,
  fy: number,
): number {
  const top = p00 + (p10 - p00) * fx
  const bottom = p01 + (p11 - p01) * fx
  return Math.round(top + (bottom - top) * fy)
}
