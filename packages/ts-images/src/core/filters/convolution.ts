import type { ImageData } from '../image-data'
import { createImageData } from '../image-data'

/**
 * Apply a convolution kernel to an image
 *
 * @param src Source image data
 * @param kernel 2D convolution kernel (must be square with odd dimensions)
 * @param divisor Optional divisor for the kernel (default: sum of kernel values or 1)
 * @param offset Optional offset to add to the result (default: 0)
 */
export function convolve(
  src: ImageData,
  kernel: number[][],
  divisor?: number,
  offset: number = 0,
): ImageData {
  const kSize = kernel.length
  const kRadius = Math.floor(kSize / 2)

  // Calculate divisor if not provided
  if (divisor === undefined) {
    divisor = 0
    for (let ky = 0; ky < kSize; ky++) {
      for (let kx = 0; kx < kSize; kx++) {
        divisor += kernel[ky][kx]
      }
    }
    if (divisor === 0)
      divisor = 1
  }

  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      let r = 0
      let g = 0
      let b = 0

      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = Math.min(src.width - 1, Math.max(0, x + kx - kRadius))
          const py = Math.min(src.height - 1, Math.max(0, y + ky - kRadius))
          const srcIdx = (py * src.width + px) * 4
          const weight = kernel[ky][kx]

          r += src.data[srcIdx] * weight
          g += src.data[srcIdx + 1] * weight
          b += src.data[srcIdx + 2] * weight
        }
      }

      const dstIdx = (y * src.width + x) * 4
      dst.data[dstIdx] = clamp(r / divisor + offset)
      dst.data[dstIdx + 1] = clamp(g / divisor + offset)
      dst.data[dstIdx + 2] = clamp(b / divisor + offset)
      dst.data[dstIdx + 3] = src.data[(y * src.width + x) * 4 + 3] // Keep alpha
    }
  }

  return dst
}

/**
 * Apply Sobel edge detection
 */
export function sobelEdgeDetection(src: ImageData): ImageData {
  // Sobel kernels
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ]

  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ]

  const gx = convolve(src, sobelX, 1, 0)
  const gy = convolve(src, sobelY, 1, 0)

  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let i = 0; i < src.data.length; i += 4) {
    // Calculate gradient magnitude for each channel
    for (let c = 0; c < 3; c++) {
      const vx = gx.data[i + c] - 128
      const vy = gy.data[i + c] - 128
      dst.data[i + c] = clamp(Math.sqrt(vx * vx + vy * vy))
    }
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Apply emboss effect
 */
export function emboss(src: ImageData, strength: number = 1): ImageData {
  const kernel = [
    [-2 * strength, -strength, 0],
    [-strength, 1, strength],
    [0, strength, 2 * strength],
  ]

  return convolve(src, kernel, 1, 128)
}

/**
 * Pre-defined convolution kernels
 */
export const KERNELS = {
  /** Identity kernel (no change) */
  identity: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ],

  /** 3x3 box blur */
  boxBlur3x3: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],

  /** 5x5 Gaussian blur approximation */
  gaussian5x5: [
    [1, 4, 6, 4, 1],
    [4, 16, 24, 16, 4],
    [6, 24, 36, 24, 6],
    [4, 16, 24, 16, 4],
    [1, 4, 6, 4, 1],
  ],

  /** Sharpen kernel */
  sharpen: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ],

  /** Edge detection (Laplacian) */
  laplacian: [
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0],
  ],

  /** Emboss */
  emboss: [
    [-2, -1, 0],
    [-1, 1, 1],
    [0, 1, 2],
  ],
}

function clamp(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}
