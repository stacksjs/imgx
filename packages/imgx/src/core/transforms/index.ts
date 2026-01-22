import type { ImageData } from '../image-data'
import { createImageData, getPixelBilinear, setPixel } from '../image-data'

/**
 * Rotate an image by arbitrary degrees
 *
 * @param src Source image data
 * @param degrees Rotation angle in degrees (positive = clockwise)
 * @param options Rotation options
 */
export function rotate(
  src: ImageData,
  degrees: number,
  options: {
    background?: { r: number, g: number, b: number, a?: number }
    expand?: boolean
  } = {},
): ImageData {
  const { background = { r: 0, g: 0, b: 0, a: 0 }, expand = true } = options

  // Normalize angle to 0-360
  degrees = ((degrees % 360) + 360) % 360

  // Handle exact 90-degree rotations specially for speed and precision
  if (degrees === 0) {
    return { ...src, data: new Uint8ClampedArray(src.data) }
  }
  if (degrees === 90) {
    return rotate90(src)
  }
  if (degrees === 180) {
    return rotate180(src)
  }
  if (degrees === 270) {
    return rotate270(src)
  }

  // Convert to radians
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  // Calculate new dimensions if expanding
  let newWidth: number
  let newHeight: number

  if (expand) {
    newWidth = Math.ceil(Math.abs(src.width * cos) + Math.abs(src.height * sin))
    newHeight = Math.ceil(Math.abs(src.width * sin) + Math.abs(src.height * cos))
  }
  else {
    newWidth = src.width
    newHeight = src.height
  }

  const dst = createImageData(newWidth, newHeight, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
    fill: background,
  })

  // Center of source and destination
  const srcCenterX = src.width / 2
  const srcCenterY = src.height / 2
  const dstCenterX = newWidth / 2
  const dstCenterY = newHeight / 2

  // Rotate by sampling from source (inverse mapping)
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      // Translate to origin, rotate inversely, translate back
      const dx = x - dstCenterX
      const dy = y - dstCenterY

      const srcX = dx * cos + dy * sin + srcCenterX
      const srcY = -dx * sin + dy * cos + srcCenterY

      if (srcX >= 0 && srcX < src.width && srcY >= 0 && srcY < src.height) {
        const pixel = getPixelBilinear(src, srcX, srcY)
        setPixel(dst, x, y, pixel)
      }
    }
  }

  return dst
}

/**
 * Rotate 90 degrees clockwise
 */
export function rotate90(src: ImageData): ImageData {
  const dst = createImageData(src.height, src.width, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const srcIdx = (y * src.width + x) * 4
      const dstIdx = (x * dst.width + (src.height - 1 - y)) * 4

      dst.data[dstIdx] = src.data[srcIdx]
      dst.data[dstIdx + 1] = src.data[srcIdx + 1]
      dst.data[dstIdx + 2] = src.data[srcIdx + 2]
      dst.data[dstIdx + 3] = src.data[srcIdx + 3]
    }
  }

  return dst
}

/**
 * Rotate 180 degrees
 */
export function rotate180(src: ImageData): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  const lastIdx = src.data.length - 4
  for (let i = 0; i < src.data.length; i += 4) {
    const srcIdx = lastIdx - i
    dst.data[i] = src.data[srcIdx]
    dst.data[i + 1] = src.data[srcIdx + 1]
    dst.data[i + 2] = src.data[srcIdx + 2]
    dst.data[i + 3] = src.data[srcIdx + 3]
  }

  return dst
}

/**
 * Rotate 270 degrees clockwise (90 degrees counter-clockwise)
 */
export function rotate270(src: ImageData): ImageData {
  const dst = createImageData(src.height, src.width, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const srcIdx = (y * src.width + x) * 4
      const dstIdx = ((src.width - 1 - x) * dst.width + y) * 4

      dst.data[dstIdx] = src.data[srcIdx]
      dst.data[dstIdx + 1] = src.data[srcIdx + 1]
      dst.data[dstIdx + 2] = src.data[srcIdx + 2]
      dst.data[dstIdx + 3] = src.data[srcIdx + 3]
    }
  }

  return dst
}

/**
 * Flip image vertically (mirror along horizontal axis)
 */
export function flip(src: ImageData): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  const rowSize = src.width * 4

  for (let y = 0; y < src.height; y++) {
    const srcRowStart = y * rowSize
    const dstRowStart = (src.height - 1 - y) * rowSize

    for (let i = 0; i < rowSize; i++) {
      dst.data[dstRowStart + i] = src.data[srcRowStart + i]
    }
  }

  return dst
}

/**
 * Flop image horizontally (mirror along vertical axis)
 */
export function flop(src: ImageData): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const srcIdx = (y * src.width + x) * 4
      const dstIdx = (y * src.width + (src.width - 1 - x)) * 4

      dst.data[dstIdx] = src.data[srcIdx]
      dst.data[dstIdx + 1] = src.data[srcIdx + 1]
      dst.data[dstIdx + 2] = src.data[srcIdx + 2]
      dst.data[dstIdx + 3] = src.data[srcIdx + 3]
    }
  }

  return dst
}

/**
 * Crop an image to the specified region
 */
export function crop(
  src: ImageData,
  options: {
    left: number
    top: number
    width: number
    height: number
  },
): ImageData {
  const { left, top, width, height } = options

  // Validate bounds
  const actualLeft = Math.max(0, Math.min(left, src.width))
  const actualTop = Math.max(0, Math.min(top, src.height))
  const actualWidth = Math.min(width, src.width - actualLeft)
  const actualHeight = Math.min(height, src.height - actualTop)

  const dst = createImageData(actualWidth, actualHeight, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let y = 0; y < actualHeight; y++) {
    const srcRowStart = ((actualTop + y) * src.width + actualLeft) * 4
    const dstRowStart = y * actualWidth * 4
    const rowLength = actualWidth * 4

    for (let i = 0; i < rowLength; i++) {
      dst.data[dstRowStart + i] = src.data[srcRowStart + i]
    }
  }

  return dst
}

/**
 * Extract a region from an image (alias for crop)
 */
export const extract = crop

/**
 * Extend an image with padding
 */
export function extend(
  src: ImageData,
  options: {
    top?: number
    bottom?: number
    left?: number
    right?: number
    background?: { r: number, g: number, b: number, a?: number }
  },
): ImageData {
  const {
    top = 0,
    bottom = 0,
    left = 0,
    right = 0,
    background = { r: 0, g: 0, b: 0, a: 255 },
  } = options

  const newWidth = src.width + left + right
  const newHeight = src.height + top + bottom

  const dst = createImageData(newWidth, newHeight, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
    fill: background,
  })

  // Copy source image to new position
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const srcIdx = (y * src.width + x) * 4
      const dstIdx = ((y + top) * newWidth + (x + left)) * 4

      dst.data[dstIdx] = src.data[srcIdx]
      dst.data[dstIdx + 1] = src.data[srcIdx + 1]
      dst.data[dstIdx + 2] = src.data[srcIdx + 2]
      dst.data[dstIdx + 3] = src.data[srcIdx + 3]
    }
  }

  return dst
}

/**
 * Trim transparent or uniform color borders from an image
 */
export function trim(
  src: ImageData,
  options: {
    threshold?: number
    background?: { r: number, g: number, b: number, a?: number }
  } = {},
): ImageData {
  const { threshold = 10, background } = options

  // Determine background color (use top-left pixel if not specified)
  const bgColor = background || {
    r: src.data[0],
    g: src.data[1],
    b: src.data[2],
    a: src.data[3],
  }

  // Find bounds
  let minX = src.width
  let minY = src.height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const idx = (y * src.width + x) * 4

      const diff
        = Math.abs(src.data[idx] - bgColor.r)
        + Math.abs(src.data[idx + 1] - bgColor.g)
        + Math.abs(src.data[idx + 2] - bgColor.b)
        + Math.abs(src.data[idx + 3] - (bgColor.a ?? 255))

      if (diff > threshold) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  // If no content found, return a 1x1 image
  if (minX > maxX || minY > maxY) {
    return createImageData(1, 1, {
      colorSpace: src.colorSpace,
      hasAlpha: src.hasAlpha,
      bitDepth: src.bitDepth,
    })
  }

  return crop(src, {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
}
