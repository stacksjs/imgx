import type { ImageData } from '../image-data'
import { createImageData } from '../image-data'

/**
 * Convert an image to grayscale using luminance weighting
 */
export function grayscale(src: ImageData): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let i = 0; i < src.data.length; i += 4) {
    // Use ITU-R BT.709 luminance coefficients
    const luminance = Math.round(
      src.data[i] * 0.2126
      + src.data[i + 1] * 0.7152
      + src.data[i + 2] * 0.0722,
    )

    dst.data[i] = luminance
    dst.data[i + 1] = luminance
    dst.data[i + 2] = luminance
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Apply a binary threshold to an image
 * Pixels with luminance above the threshold become white, others become black
 */
export function threshold(
  src: ImageData,
  level: number = 128,
  options: {
    grayscale?: boolean
  } = {},
): ImageData {
  const { grayscale: convertToGray = true } = options

  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let i = 0; i < src.data.length; i += 4) {
    const luminance
      = src.data[i] * 0.2126
      + src.data[i + 1] * 0.7152
      + src.data[i + 2] * 0.0722

    const value = luminance >= level ? 255 : 0

    if (convertToGray) {
      dst.data[i] = value
      dst.data[i + 1] = value
      dst.data[i + 2] = value
    }
    else {
      // Scale original colors
      const scale = value / 255
      dst.data[i] = Math.round(src.data[i] * scale)
      dst.data[i + 1] = Math.round(src.data[i + 1] * scale)
      dst.data[i + 2] = Math.round(src.data[i + 2] * scale)
    }
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Modulate image brightness, saturation, and hue
 */
export function modulate(
  src: ImageData,
  options: {
    brightness?: number // 1.0 = no change, 0.5 = 50% darker, 2.0 = 2x brighter
    saturation?: number // 1.0 = no change, 0 = grayscale, 2.0 = 2x saturation
    hue?: number // Degrees to rotate hue (0-360)
    lightness?: number // 1.0 = no change
  },
): ImageData {
  const {
    brightness = 1,
    saturation = 1,
    hue = 0,
    lightness = 1,
  } = options

  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let i = 0; i < src.data.length; i += 4) {
    // Convert RGB to HSL
    let [h, s, l] = rgbToHsl(src.data[i], src.data[i + 1], src.data[i + 2])

    // Apply modulations
    h = (h + hue) % 360
    s = Math.min(1, Math.max(0, s * saturation))
    l = Math.min(1, Math.max(0, l * lightness * brightness))

    // Convert back to RGB
    const [r, g, b] = hslToRgb(h, s, l)

    dst.data[i] = r
    dst.data[i + 1] = g
    dst.data[i + 2] = b
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Invert image colors
 */
export function invert(src: ImageData): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let i = 0; i < src.data.length; i += 4) {
    dst.data[i] = 255 - src.data[i]
    dst.data[i + 1] = 255 - src.data[i + 1]
    dst.data[i + 2] = 255 - src.data[i + 2]
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Apply sepia tone effect
 */
export function sepia(src: ImageData, amount: number = 1): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i]
    const g = src.data[i + 1]
    const b = src.data[i + 2]

    // Sepia transformation matrix
    const sepiaR = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
    const sepiaG = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
    const sepiaB = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)

    // Blend with original based on amount
    dst.data[i] = Math.round(r + (sepiaR - r) * amount)
    dst.data[i + 1] = Math.round(g + (sepiaG - g) * amount)
    dst.data[i + 2] = Math.round(b + (sepiaB - b) * amount)
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Adjust image contrast
 */
export function contrast(src: ImageData, factor: number = 1): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  const intercept = 128 * (1 - factor)

  for (let i = 0; i < src.data.length; i += 4) {
    dst.data[i] = clamp(src.data[i] * factor + intercept)
    dst.data[i + 1] = clamp(src.data[i + 1] * factor + intercept)
    dst.data[i + 2] = clamp(src.data[i + 2] * factor + intercept)
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Adjust gamma correction
 */
export function gamma(src: ImageData, value: number = 1): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  // Pre-compute lookup table for performance
  const gammaCorrection = 1 / value
  const lut = new Uint8Array(256)

  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * ((i / 255) ** gammaCorrection))
  }

  for (let i = 0; i < src.data.length; i += 4) {
    dst.data[i] = lut[src.data[i]]
    dst.data[i + 1] = lut[src.data[i + 1]]
    dst.data[i + 2] = lut[src.data[i + 2]]
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Normalize image colors (stretch histogram)
 */
export function normalize(src: ImageData): ImageData {
  // Find min and max values for each channel
  let minR = 255
  let maxR = 0
  let minG = 255
  let maxG = 0
  let minB = 255
  let maxB = 0

  for (let i = 0; i < src.data.length; i += 4) {
    minR = Math.min(minR, src.data[i])
    maxR = Math.max(maxR, src.data[i])
    minG = Math.min(minG, src.data[i + 1])
    maxG = Math.max(maxG, src.data[i + 1])
    minB = Math.min(minB, src.data[i + 2])
    maxB = Math.max(maxB, src.data[i + 2])
  }

  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  const rangeR = maxR - minR || 1
  const rangeG = maxG - minG || 1
  const rangeB = maxB - minB || 1

  for (let i = 0; i < src.data.length; i += 4) {
    dst.data[i] = Math.round(((src.data[i] - minR) / rangeR) * 255)
    dst.data[i + 1] = Math.round(((src.data[i + 1] - minG) / rangeG) * 255)
    dst.data[i + 2] = Math.round(((src.data[i + 2] - minB) / rangeB) * 255)
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Tint image with a color
 */
export function tint(
  src: ImageData,
  color: { r: number, g: number, b: number },
  amount: number = 0.5,
): ImageData {
  const dst = createImageData(src.width, src.height, {
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  for (let i = 0; i < src.data.length; i += 4) {
    // Convert to grayscale first
    const gray
      = src.data[i] * 0.2126
      + src.data[i + 1] * 0.7152
      + src.data[i + 2] * 0.0722

    // Apply tint
    const tintedR = gray * color.r / 255
    const tintedG = gray * color.g / 255
    const tintedB = gray * color.b / 255

    // Blend with original
    dst.data[i] = Math.round(src.data[i] + (tintedR - src.data[i]) * amount)
    dst.data[i + 1] = Math.round(src.data[i + 1] + (tintedG - src.data[i + 1]) * amount)
    dst.data[i + 2] = Math.round(src.data[i + 2] + (tintedB - src.data[i + 2]) * amount)
    dst.data[i + 3] = src.data[i + 3]
  }

  return dst
}

/**
 * Get the dominant color of an image
 */
export function getDominantColor(src: ImageData): { r: number, g: number, b: number } {
  let totalR = 0
  let totalG = 0
  let totalB = 0
  let count = 0

  for (let i = 0; i < src.data.length; i += 4) {
    // Skip transparent pixels
    if (src.data[i + 3] < 128)
      continue

    totalR += src.data[i]
    totalG += src.data[i + 1]
    totalB += src.data[i + 2]
    count++
  }

  if (count === 0) {
    return { r: 0, g: 0, b: 0 }
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  }
}

// Color space conversion utilities

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return [0, 0, l]
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    case b:
      h = ((r - g) / d + 4) / 6
      break
  }

  return [h * 360, s, l]
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360

  if (s === 0) {
    const gray = Math.round(l * 255)
    return [gray, gray, gray]
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0)
      t += 1
    if (t > 1)
      t -= 1
    if (t < 1 / 6)
      return p + (q - p) * 6 * t
    if (t < 1 / 2)
      return q
    if (t < 2 / 3)
      return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  const r = hue2rgb(p, q, h + 1 / 3)
  const g = hue2rgb(p, q, h)
  const b = hue2rgb(p, q, h - 1 / 3)

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

/**
 * Convert sRGB to linear RGB
 */
export function srgbToLinear(value: number): number {
  value = value / 255
  if (value <= 0.04045) {
    return value / 12.92
  }
  return ((value + 0.055) / 1.055) ** 2.4
}

/**
 * Convert linear RGB to sRGB
 */
export function linearToSrgb(value: number): number {
  if (value <= 0.0031308) {
    return Math.round(value * 12.92 * 255)
  }
  return Math.round((1.055 * (value ** (1 / 2.4)) - 0.055) * 255)
}

/**
 * Convert image color space
 */
export function toColorSpace(
  src: ImageData,
  targetSpace: 'srgb' | 'linear-srgb',
): ImageData {
  if (src.colorSpace === targetSpace) {
    return { ...src, data: new Uint8ClampedArray(src.data) }
  }

  const dst = createImageData(src.width, src.height, {
    colorSpace: targetSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  })

  if (targetSpace === 'linear-srgb') {
    // sRGB to linear
    for (let i = 0; i < src.data.length; i += 4) {
      dst.data[i] = Math.round(srgbToLinear(src.data[i]) * 255)
      dst.data[i + 1] = Math.round(srgbToLinear(src.data[i + 1]) * 255)
      dst.data[i + 2] = Math.round(srgbToLinear(src.data[i + 2]) * 255)
      dst.data[i + 3] = src.data[i + 3]
    }
  }
  else {
    // linear to sRGB
    for (let i = 0; i < src.data.length; i += 4) {
      dst.data[i] = linearToSrgb(src.data[i] / 255)
      dst.data[i + 1] = linearToSrgb(src.data[i + 1] / 255)
      dst.data[i + 2] = linearToSrgb(src.data[i + 2] / 255)
      dst.data[i + 3] = src.data[i + 3]
    }
  }

  return dst
}

function clamp(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}
