import type { ImageData } from '../image-data'
import { createImageData } from '../image-data'

/**
 * Apply Gaussian blur to an image
 * Uses separable convolution for better performance
 *
 * @param src Source image data
 * @param sigma Standard deviation of the Gaussian kernel
 */
export function blur(src: ImageData, sigma: number): ImageData {
  if (sigma <= 0) {
    return { ...src, data: new Uint8ClampedArray(src.data) }
  }

  // Generate 1D Gaussian kernel
  const kernel = generateGaussianKernel(sigma)
  const radius = Math.floor(kernel.length / 2)

  // Apply horizontal blur
  const temp = applyHorizontalBlur(src, kernel, radius)

  // Apply vertical blur
  return applyVerticalBlur(temp, kernel, radius)
}

/**
 * Generate a 1D Gaussian kernel
 */
function generateGaussianKernel(sigma: number): number[] {
  // Kernel size should be 6*sigma for 99.7% coverage, but at least 3
  const radius = Math.max(1, Math.ceil(sigma * 3))
  const size = radius * 2 + 1
  const kernel: number[] = []
  let sum = 0

  for (let i = 0; i < size; i++) {
    const x = i - radius
    const value = Math.exp(-(x * x) / (2 * sigma * sigma))
    kernel.push(value)
    sum += value
  }

  // Normalize kernel
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum
  }

  return kernel
}

/**
 * Apply horizontal Gaussian blur
 */
function applyHorizontalBlur(
  src: ImageData,
  kernel: number[],
  radius: number,
): ImageData {
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
      let a = 0

      for (let k = -radius; k <= radius; k++) {
        const px = Math.min(src.width - 1, Math.max(0, x + k))
        const srcIdx = (y * src.width + px) * 4
        const weight = kernel[k + radius]

        r += src.data[srcIdx] * weight
        g += src.data[srcIdx + 1] * weight
        b += src.data[srcIdx + 2] * weight
        a += src.data[srcIdx + 3] * weight
      }

      const dstIdx = (y * src.width + x) * 4
      dst.data[dstIdx] = Math.round(r)
      dst.data[dstIdx + 1] = Math.round(g)
      dst.data[dstIdx + 2] = Math.round(b)
      dst.data[dstIdx + 3] = Math.round(a)
    }
  }

  return dst
}

/**
 * Apply vertical Gaussian blur
 */
function applyVerticalBlur(
  src: ImageData,
  kernel: number[],
  radius: number,
): ImageData {
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
      let a = 0

      for (let k = -radius; k <= radius; k++) {
        const py = Math.min(src.height - 1, Math.max(0, y + k))
        const srcIdx = (py * src.width + x) * 4
        const weight = kernel[k + radius]

        r += src.data[srcIdx] * weight
        g += src.data[srcIdx + 1] * weight
        b += src.data[srcIdx + 2] * weight
        a += src.data[srcIdx + 3] * weight
      }

      const dstIdx = (y * src.width + x) * 4
      dst.data[dstIdx] = Math.round(r)
      dst.data[dstIdx + 1] = Math.round(g)
      dst.data[dstIdx + 2] = Math.round(b)
      dst.data[dstIdx + 3] = Math.round(a)
    }
  }

  return dst
}

/**
 * Apply box blur (faster but lower quality than Gaussian)
 */
export function boxBlur(src: ImageData, radius: number): ImageData {
  if (radius <= 0) {
    return { ...src, data: new Uint8ClampedArray(src.data) }
  }

  const r = Math.floor(radius)
  const size = r * 2 + 1

  // Horizontal pass
  const temp = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let y = 0; y < src.height; y++) {
    // Initialize running sums for the first pixel
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let sumA = 0

    // Fill initial window
    for (let k = -r; k <= r; k++) {
      const px = Math.max(0, Math.min(src.width - 1, k))
      const idx = (y * src.width + px) * 4
      sumR += src.data[idx]
      sumG += src.data[idx + 1]
      sumB += src.data[idx + 2]
      sumA += src.data[idx + 3]
    }

    for (let x = 0; x < src.width; x++) {
      const dstIdx = (y * src.width + x) * 4
      temp.data[dstIdx] = Math.round(sumR / size)
      temp.data[dstIdx + 1] = Math.round(sumG / size)
      temp.data[dstIdx + 2] = Math.round(sumB / size)
      temp.data[dstIdx + 3] = Math.round(sumA / size)

      // Slide the window
      const leftX = Math.max(0, x - r)
      const rightX = Math.min(src.width - 1, x + r + 1)

      const leftIdx = (y * src.width + leftX) * 4
      const rightIdx = (y * src.width + rightX) * 4

      sumR += src.data[rightIdx] - src.data[leftIdx]
      sumG += src.data[rightIdx + 1] - src.data[leftIdx + 1]
      sumB += src.data[rightIdx + 2] - src.data[leftIdx + 2]
      sumA += src.data[rightIdx + 3] - src.data[leftIdx + 3]
    }
  }

  // Vertical pass
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let x = 0; x < src.width; x++) {
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let sumA = 0

    for (let k = -r; k <= r; k++) {
      const py = Math.max(0, Math.min(src.height - 1, k))
      const idx = (py * src.width + x) * 4
      sumR += temp.data[idx]
      sumG += temp.data[idx + 1]
      sumB += temp.data[idx + 2]
      sumA += temp.data[idx + 3]
    }

    for (let y = 0; y < src.height; y++) {
      const dstIdx = (y * src.width + x) * 4
      dst.data[dstIdx] = Math.round(sumR / size)
      dst.data[dstIdx + 1] = Math.round(sumG / size)
      dst.data[dstIdx + 2] = Math.round(sumB / size)
      dst.data[dstIdx + 3] = Math.round(sumA / size)

      const topY = Math.max(0, y - r)
      const bottomY = Math.min(src.height - 1, y + r + 1)

      const topIdx = (topY * src.width + x) * 4
      const bottomIdx = (bottomY * src.width + x) * 4

      sumR += temp.data[bottomIdx] - temp.data[topIdx]
      sumG += temp.data[bottomIdx + 1] - temp.data[topIdx + 1]
      sumB += temp.data[bottomIdx + 2] - temp.data[topIdx + 2]
      sumA += temp.data[bottomIdx + 3] - temp.data[topIdx + 3]
    }
  }

  return dst
}
