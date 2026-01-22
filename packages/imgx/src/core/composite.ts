import type { ImageData } from './image-data'
import { createImageData } from './image-data'

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'dest-in'
  | 'dest-out'
  | 'source-atop'
  | 'source-over'

export interface CompositeOptions {
  /** Blend mode */
  blend?: BlendMode
  /** Opacity of the overlay (0-1) */
  opacity?: number
  /** X position to place the overlay */
  left?: number
  /** Y position to place the overlay */
  top?: number
  /** Whether to tile the overlay */
  tile?: boolean
}

/**
 * Composite one image over another
 */
export function composite(
  base: ImageData,
  overlay: ImageData,
  options: CompositeOptions = {},
): ImageData {
  const {
    blend = 'normal',
    opacity = 1,
    left = 0,
    top = 0,
    tile = false,
  } = options

  // Clone the base image
  const dst = createImageData(base.width, base.height, {
    colorSpace: base.colorSpace,
    hasAlpha: base.hasAlpha,
    bitDepth: base.bitDepth,
  })

  // Copy base pixels
  dst.data.set(base.data)

  // Get blend function
  const blendFn = getBlendFunction(blend)

  // Composite overlay onto destination
  for (let y = 0; y < base.height; y++) {
    for (let x = 0; x < base.width; x++) {
      // Calculate overlay position
      let overlayX: number
      let overlayY: number

      if (tile) {
        overlayX = ((x - left) % overlay.width + overlay.width) % overlay.width
        overlayY = ((y - top) % overlay.height + overlay.height) % overlay.height
      }
      else {
        overlayX = x - left
        overlayY = y - top

        // Skip if outside overlay bounds
        if (overlayX < 0 || overlayX >= overlay.width || overlayY < 0 || overlayY >= overlay.height) {
          continue
        }
      }

      const baseIdx = (y * base.width + x) * 4
      const overlayIdx = (overlayY * overlay.width + overlayX) * 4

      // Get colors
      const baseR = dst.data[baseIdx] / 255
      const baseG = dst.data[baseIdx + 1] / 255
      const baseB = dst.data[baseIdx + 2] / 255
      const baseA = dst.data[baseIdx + 3] / 255

      const overlayR = overlay.data[overlayIdx] / 255
      const overlayG = overlay.data[overlayIdx + 1] / 255
      const overlayB = overlay.data[overlayIdx + 2] / 255
      const overlayA = (overlay.data[overlayIdx + 3] / 255) * opacity

      // Apply blend mode
      const blendedR = blendFn(baseR, overlayR)
      const blendedG = blendFn(baseG, overlayG)
      const blendedB = blendFn(baseB, overlayB)

      // Alpha compositing
      const outA = overlayA + baseA * (1 - overlayA)

      if (outA > 0) {
        const mixR = (overlayR * overlayA + baseR * baseA * (1 - overlayA)) / outA
        const mixG = (overlayG * overlayA + baseG * baseA * (1 - overlayA)) / outA
        const mixB = (overlayB * overlayA + baseB * baseA * (1 - overlayA)) / outA

        // Blend between base and blended colors based on alpha
        const finalR = baseR + (blendedR - baseR) * overlayA
        const finalG = baseG + (blendedG - baseG) * overlayA
        const finalB = baseB + (blendedB - baseB) * overlayA

        // For normal blend mode, use simple alpha compositing
        if (blend === 'normal' || blend === 'source-over') {
          dst.data[baseIdx] = Math.round(mixR * 255)
          dst.data[baseIdx + 1] = Math.round(mixG * 255)
          dst.data[baseIdx + 2] = Math.round(mixB * 255)
        }
        else {
          dst.data[baseIdx] = Math.round(finalR * 255)
          dst.data[baseIdx + 1] = Math.round(finalG * 255)
          dst.data[baseIdx + 2] = Math.round(finalB * 255)
        }
        dst.data[baseIdx + 3] = Math.round(outA * 255)
      }
    }
  }

  return dst
}

/**
 * Composite multiple images together
 */
export function compositeMultiple(
  base: ImageData,
  layers: Array<{
    input: ImageData
    options?: CompositeOptions
  }>,
): ImageData {
  let result = base

  for (const layer of layers) {
    result = composite(result, layer.input, layer.options)
  }

  return result
}

/**
 * Get blend function for the specified mode
 */
function getBlendFunction(mode: BlendMode): (base: number, overlay: number) => number {
  switch (mode) {
    case 'normal':
    case 'source-over':
      return (_base, overlay) => overlay

    case 'multiply':
      return (base, overlay) => base * overlay

    case 'screen':
      return (base, overlay) => 1 - (1 - base) * (1 - overlay)

    case 'overlay':
      return (base, overlay) => {
        if (base < 0.5) {
          return 2 * base * overlay
        }
        return 1 - 2 * (1 - base) * (1 - overlay)
      }

    case 'darken':
      return (base, overlay) => Math.min(base, overlay)

    case 'lighten':
      return (base, overlay) => Math.max(base, overlay)

    case 'color-dodge':
      return (base, overlay) => {
        if (overlay >= 1)
          return 1
        return Math.min(1, base / (1 - overlay))
      }

    case 'color-burn':
      return (base, overlay) => {
        if (overlay <= 0)
          return 0
        return 1 - Math.min(1, (1 - base) / overlay)
      }

    case 'hard-light':
      return (base, overlay) => {
        if (overlay < 0.5) {
          return 2 * base * overlay
        }
        return 1 - 2 * (1 - base) * (1 - overlay)
      }

    case 'soft-light':
      return (base, overlay) => {
        if (overlay < 0.5) {
          return base - (1 - 2 * overlay) * base * (1 - base)
        }
        const d = base <= 0.25
          ? ((16 * base - 12) * base + 4) * base
          : Math.sqrt(base)
        return base + (2 * overlay - 1) * (d - base)
      }

    case 'difference':
      return (base, overlay) => Math.abs(base - overlay)

    case 'exclusion':
      return (base, overlay) => base + overlay - 2 * base * overlay

    case 'dest-in':
      return (base, _overlay) => base

    case 'dest-out':
      return (base, _overlay) => base

    case 'source-atop':
      return (_base, overlay) => overlay

    default:
      return (_base, overlay) => overlay
  }
}

/**
 * Create a canvas/image with a solid color
 */
export function createSolidColor(
  width: number,
  height: number,
  color: { r: number, g: number, b: number, a?: number },
): ImageData {
  return createImageData(width, height, {
    colorSpace: 'srgb',
    hasAlpha: true,
    bitDepth: 8,
    fill: color,
  })
}

/**
 * Create a gradient image
 */
export function createLinearGradient(
  width: number,
  height: number,
  startColor: { r: number, g: number, b: number, a?: number },
  endColor: { r: number, g: number, b: number, a?: number },
  direction: 'horizontal' | 'vertical' | 'diagonal' = 'horizontal',
): ImageData {
  const dst = createImageData(width, height, {
    colorSpace: 'srgb',
    hasAlpha: true,
    bitDepth: 8,
  })

  const startA = startColor.a ?? 255
  const endA = endColor.a ?? 255

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let t: number

      switch (direction) {
        case 'horizontal':
          t = x / (width - 1 || 1)
          break
        case 'vertical':
          t = y / (height - 1 || 1)
          break
        case 'diagonal':
          t = (x + y) / ((width - 1) + (height - 1) || 1)
          break
      }

      const idx = (y * width + x) * 4
      dst.data[idx] = Math.round(startColor.r + (endColor.r - startColor.r) * t)
      dst.data[idx + 1] = Math.round(startColor.g + (endColor.g - startColor.g) * t)
      dst.data[idx + 2] = Math.round(startColor.b + (endColor.b - startColor.b) * t)
      dst.data[idx + 3] = Math.round(startA + (endA - startA) * t)
    }
  }

  return dst
}
