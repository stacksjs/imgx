import type { ImageData } from '../image-data'
import { createImageData } from '../image-data'
import { blur } from './blur'

export interface SharpenOptions {
  /** Standard deviation of the Gaussian blur (default: 1) */
  sigma?: number
  /** Amount of sharpening to apply (default: 1) */
  amount?: number
  /** Threshold for edge detection (default: 0) */
  threshold?: number
}

/**
 * Apply unsharp mask sharpening to an image
 * This is the standard sharpening algorithm used by most image editors
 *
 * @param src Source image data
 * @param options Sharpening options
 */
export function sharpen(src: ImageData, options: SharpenOptions = {}): ImageData {
  const {
    sigma = 1,
    amount = 1,
    threshold = 0,
  } = options

  if (amount <= 0) {
    return { ...src, data: new Uint8ClampedArray(src.data) }
  }

  // Create blurred version
  const blurred = blur(src, sigma)

  // Apply unsharp mask: output = original + amount * (original - blurred)
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let i = 0; i < src.data.length; i += 4) {
    // Calculate difference for each channel
    const diffR = src.data[i] - blurred.data[i]
    const diffG = src.data[i + 1] - blurred.data[i + 1]
    const diffB = src.data[i + 2] - blurred.data[i + 2]

    // Apply threshold - only sharpen if difference is above threshold
    if (threshold > 0) {
      const luminanceDiff = Math.abs(diffR * 0.299 + diffG * 0.587 + diffB * 0.114)
      if (luminanceDiff < threshold) {
        dst.data[i] = src.data[i]
        dst.data[i + 1] = src.data[i + 1]
        dst.data[i + 2] = src.data[i + 2]
        dst.data[i + 3] = src.data[i + 3]
        continue
      }
    }

    // Apply sharpening
    dst.data[i] = clamp(src.data[i] + diffR * amount)
    dst.data[i + 1] = clamp(src.data[i + 1] + diffG * amount)
    dst.data[i + 2] = clamp(src.data[i + 2] + diffB * amount)
    dst.data[i + 3] = src.data[i + 3] // Keep original alpha
  }

  return dst
}

/**
 * Apply convolution-based sharpening with a custom kernel
 */
export function sharpenConvolution(
  src: ImageData,
  strength: number = 1,
): ImageData {
  // Sharpening kernel
  const center = 1 + 4 * strength
  const edge = -strength

  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const idx = (y * src.width + x) * 4

      // Get neighboring pixels
      const topY = Math.max(0, y - 1)
      const bottomY = Math.min(src.height - 1, y + 1)
      const leftX = Math.max(0, x - 1)
      const rightX = Math.min(src.width - 1, x + 1)

      const topIdx = (topY * src.width + x) * 4
      const bottomIdx = (bottomY * src.width + x) * 4
      const leftIdx = (y * src.width + leftX) * 4
      const rightIdx = (y * src.width + rightX) * 4

      // Apply kernel for each channel
      for (let c = 0; c < 3; c++) {
        const value
          = src.data[topIdx + c] * edge
          + src.data[leftIdx + c] * edge
          + src.data[idx + c] * center
          + src.data[rightIdx + c] * edge
          + src.data[bottomIdx + c] * edge

        dst.data[idx + c] = clamp(value)
      }

      // Keep original alpha
      dst.data[idx + 3] = src.data[idx + 3]
    }
  }

  return dst
}

function clamp(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}
