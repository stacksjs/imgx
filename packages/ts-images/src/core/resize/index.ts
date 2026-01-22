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
    position = 'center',
  } = options

  // If neither dimension specified, return clone
  if (!width && !height) {
    return { ...src, data: new Uint8ClampedArray(src.data) }
  }

  // Calculate target dimensions based on fit mode
  const { targetWidth, targetHeight, needsCrop, finalWidth, finalHeight } = calculateDimensions(
    src.width,
    src.height,
    width,
    height,
    fit,
  )

  // Apply resize algorithm
  let result = resizeWithKernel(src, targetWidth, targetHeight, kernel)

  // For 'cover' mode, crop to exact dimensions
  if (needsCrop && finalWidth && finalHeight) {
    result = cropToCenter(result, finalWidth, finalHeight, position)
  }

  return result
}

/**
 * Crop image to center (or specified position)
 */
function cropToCenter(
  src: ImageData,
  width: number,
  height: number,
  position: string,
): ImageData {
  let left = Math.floor((src.width - width) / 2)
  let top = Math.floor((src.height - height) / 2)

  // Adjust based on position
  switch (position) {
    case 'top':
      top = 0
      break
    case 'bottom':
      top = src.height - height
      break
    case 'left':
      left = 0
      break
    case 'right':
      left = src.width - width
      break
    case 'top-left':
      top = 0
      left = 0
      break
    case 'top-right':
      top = 0
      left = src.width - width
      break
    case 'bottom-left':
      top = src.height - height
      left = 0
      break
    case 'bottom-right':
      top = src.height - height
      left = src.width - width
      break
  }

  // Clamp values
  left = Math.max(0, left)
  top = Math.max(0, top)

  const dst = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((top + y) * src.width + (left + x)) * 4
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

interface DimensionResult {
  targetWidth: number
  targetHeight: number
  needsCrop: boolean
  finalWidth?: number
  finalHeight?: number
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
): DimensionResult {
  // If neither dimension is specified, return original size
  if (!targetWidth && !targetHeight) {
    return { targetWidth: srcWidth, targetHeight: srcHeight, needsCrop: false }
  }

  const srcAspect = srcWidth / srcHeight

  // If only one dimension is specified, calculate the other
  if (!targetWidth) {
    return {
      targetWidth: Math.round(targetHeight! * srcAspect),
      targetHeight: targetHeight!,
      needsCrop: false,
    }
  }
  if (!targetHeight) {
    return {
      targetWidth: targetWidth!,
      targetHeight: Math.round(targetWidth! / srcAspect),
      needsCrop: false,
    }
  }

  const targetAspect = targetWidth / targetHeight

  switch (fit) {
    case 'fill':
      // Stretch to exact dimensions
      return { targetWidth, targetHeight, needsCrop: false }

    case 'contain':
      // Fit within dimensions, preserving aspect ratio (may have letterboxing)
      if (srcAspect > targetAspect) {
        return {
          targetWidth,
          targetHeight: Math.round(targetWidth / srcAspect),
          needsCrop: false,
        }
      }
      return {
        targetWidth: Math.round(targetHeight * srcAspect),
        targetHeight,
        needsCrop: false,
      }

    case 'cover':
      // Cover dimensions, preserving aspect ratio, then crop to exact size
      if (srcAspect > targetAspect) {
        // Source is wider - scale to match height, crop width
        return {
          targetWidth: Math.round(targetHeight * srcAspect),
          targetHeight,
          needsCrop: true,
          finalWidth: targetWidth,
          finalHeight: targetHeight,
        }
      }
      // Source is taller - scale to match width, crop height
      return {
        targetWidth,
        targetHeight: Math.round(targetWidth / srcAspect),
        needsCrop: true,
        finalWidth: targetWidth,
        finalHeight: targetHeight,
      }

    case 'inside':
      // Resize only if larger, fit within
      if (srcWidth <= targetWidth && srcHeight <= targetHeight) {
        return { targetWidth: srcWidth, targetHeight: srcHeight, needsCrop: false }
      }
      return calculateDimensions(srcWidth, srcHeight, targetWidth, targetHeight, 'contain')

    case 'outside':
      // Resize only if smaller, cover
      if (srcWidth >= targetWidth && srcHeight >= targetHeight) {
        return { targetWidth: srcWidth, targetHeight: srcHeight, needsCrop: false }
      }
      return calculateDimensions(srcWidth, srcHeight, targetWidth, targetHeight, 'cover')

    default:
      return { targetWidth, targetHeight, needsCrop: false }
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
