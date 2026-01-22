import type { ImageData } from '../image-data'
import { createImageData, getPixel, setPixel } from '../image-data'

/**
 * Resize an image using Lanczos resampling
 * Highest quality algorithm, uses sinc-based kernel
 *
 * @param src Source image data
 * @param width Target width
 * @param height Target height
 * @param a Lanczos kernel size (2 or 3, default 3)
 */
export function resizeLanczos(
  src: ImageData,
  width: number,
  height: number,
  a: 2 | 3 = 3,
): ImageData {
  // For better performance, resize in two passes (horizontal then vertical)
  // This is a separable filter approach
  const temp = resizeLanczosHorizontal(src, width, a)
  return resizeLanczosVertical(temp, height, a)
}

/**
 * Lanczos kernel function
 */
function lanczosKernel(x: number, a: number): number {
  if (x === 0)
    return 1
  if (Math.abs(x) >= a)
    return 0

  const pix = Math.PI * x
  return (a * Math.sin(pix) * Math.sin(pix / a)) / (pix * pix)
}

/**
 * Horizontal Lanczos resize
 */
function resizeLanczosHorizontal(
  src: ImageData,
  width: number,
  a: number,
): ImageData {
  const dst = createImageData(width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  const ratio = src.width / width
  const kernelRadius = a

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = (x + 0.5) * ratio - 0.5
      const startX = Math.floor(srcX) - kernelRadius + 1
      const endX = Math.floor(srcX) + kernelRadius

      let r = 0
      let g = 0
      let b = 0
      let alpha = 0
      let weightSum = 0

      for (let i = startX; i <= endX; i++) {
        const weight = lanczosKernel(srcX - i, a)
        const px = clamp(i, 0, src.width - 1)
        const pixel = getPixel(src, px, y)

        r += pixel.r * weight
        g += pixel.g * weight
        b += pixel.b * weight
        alpha += pixel.a * weight
        weightSum += weight
      }

      if (weightSum > 0) {
        r /= weightSum
        g /= weightSum
        b /= weightSum
        alpha /= weightSum
      }

      setPixel(dst, x, y, {
        r: clamp(Math.round(r), 0, 255),
        g: clamp(Math.round(g), 0, 255),
        b: clamp(Math.round(b), 0, 255),
        a: clamp(Math.round(alpha), 0, 255),
      })
    }
  }

  return dst
}

/**
 * Vertical Lanczos resize
 */
function resizeLanczosVertical(
  src: ImageData,
  height: number,
  a: number,
): ImageData {
  const dst = createImageData(src.width, height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  const ratio = src.height / height
  const kernelRadius = a

  for (let x = 0; x < src.width; x++) {
    for (let y = 0; y < height; y++) {
      const srcY = (y + 0.5) * ratio - 0.5
      const startY = Math.floor(srcY) - kernelRadius + 1
      const endY = Math.floor(srcY) + kernelRadius

      let r = 0
      let g = 0
      let b = 0
      let alpha = 0
      let weightSum = 0

      for (let i = startY; i <= endY; i++) {
        const weight = lanczosKernel(srcY - i, a)
        const py = clamp(i, 0, src.height - 1)
        const pixel = getPixel(src, x, py)

        r += pixel.r * weight
        g += pixel.g * weight
        b += pixel.b * weight
        alpha += pixel.a * weight
        weightSum += weight
      }

      if (weightSum > 0) {
        r /= weightSum
        g /= weightSum
        b /= weightSum
        alpha /= weightSum
      }

      setPixel(dst, x, y, {
        r: clamp(Math.round(r), 0, 255),
        g: clamp(Math.round(g), 0, 255),
        b: clamp(Math.round(b), 0, 255),
        a: clamp(Math.round(alpha), 0, 255),
      })
    }
  }

  return dst
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
