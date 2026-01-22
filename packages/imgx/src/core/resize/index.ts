import type { ImageData } from '../image-data'
import { resizeBicubic } from './bicubic'
import { resizeBilinear } from './bilinear'
import { resizeLanczos } from './lanczos'

export { resizeBilinear } from './bilinear'
export { resizeBicubic } from './bicubic'
export { resizeLanczos } from './lanczos'

export type ResizeKernel = 'nearest' | 'bilinear' | 'bicubic' | 'lanczos2' | 'lanczos3'
export type ResizeFit = 'contain' | 'cover' | 'fill' | 'inside' | 'outside'

export interface ResizeOptions {
  /** Target width in pixels */
  width?: number
  /** Target height in pixels */
  height?: number
  /** Resize algorithm */
  kernel?: ResizeKernel
  /** How to fit the image within the target dimensions */
  fit?: ResizeFit
  /** Background color for padding (when fit is 'contain') */
  background?: { r: number, g: number, b: number, a?: number }
  /** Position when cropping (when fit is 'cover') */
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

/**
 * Resize an image with various algorithms and fit modes
 */
export function resize(src: ImageData, options: ResizeOptions): ImageData {
  const {
    width,
    height,
    kernel = 'lanczos3',
    fit = 'cover',
  } = options

  // Calculate target dimensions based on fit mode
  const { targetWidth, targetHeight } = calculateDimensions(
    src.width,
    src.height,
    width,
    height,
    fit,
  )

  // Apply resize algorithm
  return resizeWithKernel(src, targetWidth, targetHeight, kernel)
}

/**
 * Calculate target dimensions based on fit mode
 */
function calculateDimensions(
  srcWidth: number,
  srcHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  fit: ResizeFit = 'cover',
): { targetWidth: number, targetHeight: number } {
  // If neither dimension is specified, return original size
  if (!targetWidth && !targetHeight) {
    return { targetWidth: srcWidth, targetHeight: srcHeight }
  }

  const srcAspect = srcWidth / srcHeight

  // If only one dimension is specified, calculate the other
  if (!targetWidth) {
    return {
      targetWidth: Math.round(targetHeight! * srcAspect),
      targetHeight: targetHeight!,
    }
  }
  if (!targetHeight) {
    return {
      targetWidth: targetWidth!,
      targetHeight: Math.round(targetWidth! / srcAspect),
    }
  }

  const targetAspect = targetWidth / targetHeight

  switch (fit) {
    case 'fill':
      // Stretch to exact dimensions
      return { targetWidth, targetHeight }

    case 'contain':
      // Fit within dimensions, preserving aspect ratio (may have letterboxing)
      if (srcAspect > targetAspect) {
        return {
          targetWidth,
          targetHeight: Math.round(targetWidth / srcAspect),
        }
      }
      return {
        targetWidth: Math.round(targetHeight * srcAspect),
        targetHeight,
      }

    case 'cover':
      // Cover dimensions, preserving aspect ratio (may crop)
      if (srcAspect > targetAspect) {
        return {
          targetWidth: Math.round(targetHeight * srcAspect),
          targetHeight,
        }
      }
      return {
        targetWidth,
        targetHeight: Math.round(targetWidth / srcAspect),
      }

    case 'inside':
      // Resize only if larger, fit within
      if (srcWidth <= targetWidth && srcHeight <= targetHeight) {
        return { targetWidth: srcWidth, targetHeight: srcHeight }
      }
      return calculateDimensions(srcWidth, srcHeight, targetWidth, targetHeight, 'contain')

    case 'outside':
      // Resize only if smaller, cover
      if (srcWidth >= targetWidth && srcHeight >= targetHeight) {
        return { targetWidth: srcWidth, targetHeight: srcHeight }
      }
      return calculateDimensions(srcWidth, srcHeight, targetWidth, targetHeight, 'cover')

    default:
      return { targetWidth, targetHeight }
  }
}

/**
 * Resize using the specified kernel
 */
function resizeWithKernel(
  src: ImageData,
  width: number,
  height: number,
  kernel: ResizeKernel,
): ImageData {
  switch (kernel) {
    case 'nearest':
      return resizeNearest(src, width, height)
    case 'bilinear':
      return resizeBilinear(src, width, height)
    case 'bicubic':
      return resizeBicubic(src, width, height)
    case 'lanczos2':
      return resizeLanczos(src, width, height, 2)
    case 'lanczos3':
    default:
      return resizeLanczos(src, width, height, 3)
  }
}

/**
 * Nearest neighbor resize (fastest, pixelated result)
 */
function resizeNearest(
  src: ImageData,
  width: number,
  height: number,
): ImageData {
  const dst = new Uint8ClampedArray(width * height * 4)
  const xRatio = src.width / width
  const yRatio = src.height / height

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor(x * xRatio)
      const srcY = Math.floor(y * yRatio)
      const srcIdx = (srcY * src.width + srcX) * 4
      const dstIdx = (y * width + x) * 4

      dst[dstIdx] = src.data[srcIdx]
      dst[dstIdx + 1] = src.data[srcIdx + 1]
      dst[dstIdx + 2] = src.data[srcIdx + 2]
      dst[dstIdx + 3] = src.data[srcIdx + 3]
    }
  }

  return {
    data: dst,
    width,
    height,
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  }
}
