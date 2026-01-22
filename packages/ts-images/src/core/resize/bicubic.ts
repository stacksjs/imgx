import type { ImageData } from '../image-data'
import { createImageData, getPixel, setPixel } from '../image-data'

/**
 * Resize an image using bicubic interpolation
 * Better quality than bilinear, uses 4x4 pixel neighborhood
 */
export function resizeBicubic(
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
      const srcX = x * xRatio
      const srcY = y * yRatio

      const xi = Math.floor(srcX)
      const yi = Math.floor(srcY)

      const fx = srcX - xi
      const fy = srcY - yi

      // Sample 4x4 neighborhood
      const samples: { r: number, g: number, b: number, a: number }[][] = []

      for (let j = -1; j <= 2; j++) {
        samples[j + 1] = []
        for (let i = -1; i <= 2; i++) {
          const px = clamp(xi + i, 0, src.width - 1)
          const py = clamp(yi + j, 0, src.height - 1)
          samples[j + 1][i + 1] = getPixel(src, px, py)
        }
      }

      // Apply bicubic interpolation
      const r = bicubicInterpolate(samples, fx, fy, 'r')
      const g = bicubicInterpolate(samples, fx, fy, 'g')
      const b = bicubicInterpolate(samples, fx, fy, 'b')
      const a = bicubicInterpolate(samples, fx, fy, 'a')

      setPixel(dst, x, y, {
        r: clamp(Math.round(r), 0, 255),
        g: clamp(Math.round(g), 0, 255),
        b: clamp(Math.round(b), 0, 255),
        a: clamp(Math.round(a), 0, 255),
      })
    }
  }

  return dst
}

/**
 * Cubic interpolation kernel (Catmull-Rom spline)
 */
function cubicKernel(t: number): number {
  const at = Math.abs(t)
  if (at <= 1) {
    return 1.5 * at * at * at - 2.5 * at * at + 1
  }
  else if (at < 2) {
    return -0.5 * at * at * at + 2.5 * at * at - 4 * at + 2
  }
  return 0
}

function bicubicInterpolate(
  samples: { r: number, g: number, b: number, a: number }[][],
  fx: number,
  fy: number,
  channel: 'r' | 'g' | 'b' | 'a',
): number {
  let result = 0

  for (let j = 0; j < 4; j++) {
    let rowValue = 0
    for (let i = 0; i < 4; i++) {
      rowValue += samples[j][i][channel] * cubicKernel(fx - (i - 1))
    }
    result += rowValue * cubicKernel(fy - (j - 1))
  }

  return result
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
