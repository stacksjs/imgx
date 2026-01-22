/**
 * Unified ImageData interface for all image processing operations
 */
export interface ImageData {
  /** Raw pixel data in RGBA format (4 bytes per pixel) */
  data: Uint8Array | Uint8ClampedArray
  /** Width of the image in pixels */
  width: number
  /** Height of the image in pixels */
  height: number
  /** Color space of the image */
  colorSpace: 'srgb' | 'linear-srgb' | 'display-p3'
  /** Whether the image has an alpha channel */
  hasAlpha: boolean
  /** Bit depth per channel */
  bitDepth: 8 | 16
}

/**
 * Create a new ImageData object with the specified dimensions
 */
export function createImageData(
  width: number,
  height: number,
  options: {
    colorSpace?: 'srgb' | 'linear-srgb' | 'display-p3'
    hasAlpha?: boolean
    bitDepth?: 8 | 16
    fill?: { r: number, g: number, b: number, a?: number }
  } = {},
): ImageData {
  const {
    colorSpace = 'srgb',
    hasAlpha = true,
    bitDepth = 8,
    fill,
  } = options

  const channels = hasAlpha ? 4 : 4 // Always use 4 channels for consistency
  const bytesPerPixel = bitDepth === 16 ? channels * 2 : channels
  const dataLength = width * height * bytesPerPixel

  const data = bitDepth === 16
    ? new Uint8Array(dataLength)
    : new Uint8ClampedArray(dataLength)

  // Fill with color if specified
  if (fill) {
    const r = Math.min(255, Math.max(0, fill.r))
    const g = Math.min(255, Math.max(0, fill.g))
    const b = Math.min(255, Math.max(0, fill.b))
    const a = fill.a !== undefined ? Math.min(255, Math.max(0, fill.a)) : 255

    for (let i = 0; i < data.length; i += 4) {
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }

  return {
    data,
    width,
    height,
    colorSpace,
    hasAlpha,
    bitDepth,
  }
}

/**
 * Clone an ImageData object
 */
export function cloneImageData(src: ImageData): ImageData {
  return {
    data: new Uint8ClampedArray(src.data),
    width: src.width,
    height: src.height,
    colorSpace: src.colorSpace,
    hasAlpha: src.hasAlpha,
    bitDepth: src.bitDepth,
  }
}

/**
 * Get pixel value at the specified coordinates
 */
export function getPixel(
  imageData: ImageData,
  x: number,
  y: number,
): { r: number, g: number, b: number, a: number } {
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return { r: 0, g: 0, b: 0, a: 0 }
  }

  const idx = (y * imageData.width + x) * 4
  return {
    r: imageData.data[idx],
    g: imageData.data[idx + 1],
    b: imageData.data[idx + 2],
    a: imageData.data[idx + 3],
  }
}

/**
 * Set pixel value at the specified coordinates
 */
export function setPixel(
  imageData: ImageData,
  x: number,
  y: number,
  color: { r: number, g: number, b: number, a?: number },
): void {
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return
  }

  const idx = (y * imageData.width + x) * 4
  imageData.data[idx] = Math.min(255, Math.max(0, color.r))
  imageData.data[idx + 1] = Math.min(255, Math.max(0, color.g))
  imageData.data[idx + 2] = Math.min(255, Math.max(0, color.b))
  imageData.data[idx + 3] = color.a !== undefined ? Math.min(255, Math.max(0, color.a)) : 255
}

/**
 * Get pixel with bilinear interpolation for sub-pixel coordinates
 */
export function getPixelBilinear(
  imageData: ImageData,
  x: number,
  y: number,
): { r: number, g: number, b: number, a: number } {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, imageData.width - 1)
  const y1 = Math.min(y0 + 1, imageData.height - 1)

  const fx = x - x0
  const fy = y - y0

  const p00 = getPixel(imageData, x0, y0)
  const p10 = getPixel(imageData, x1, y0)
  const p01 = getPixel(imageData, x0, y1)
  const p11 = getPixel(imageData, x1, y1)

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  return {
    r: Math.round(lerp(lerp(p00.r, p10.r, fx), lerp(p01.r, p11.r, fx), fy)),
    g: Math.round(lerp(lerp(p00.g, p10.g, fx), lerp(p01.g, p11.g, fx), fy)),
    b: Math.round(lerp(lerp(p00.b, p10.b, fx), lerp(p01.b, p11.b, fx), fy)),
    a: Math.round(lerp(lerp(p00.a, p10.a, fx), lerp(p01.a, p11.a, fx), fy)),
  }
}

/**
 * Convert ImageData from external codec format
 */
export function fromCodecData(
  data: Uint8Array | Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  options: {
    channels?: 3 | 4
    colorSpace?: 'srgb' | 'linear-srgb' | 'display-p3'
  } = {},
): ImageData {
  const { channels = 4, colorSpace = 'srgb' } = options

  let rgba: Uint8ClampedArray

  if (channels === 3) {
    // Convert RGB to RGBA
    rgba = new Uint8ClampedArray(width * height * 4)
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      rgba[j] = data[i]
      rgba[j + 1] = data[i + 1]
      rgba[j + 2] = data[i + 2]
      rgba[j + 3] = 255
    }
  }
  else {
    rgba = data instanceof Uint8ClampedArray
      ? data
      : new Uint8ClampedArray(data)
  }

  return {
    data: rgba,
    width,
    height,
    colorSpace,
    hasAlpha: true,
    bitDepth: 8,
  }
}

/**
 * Convert ImageData to format suitable for codec encoding
 */
export function toCodecData(
  imageData: ImageData,
  options: {
    channels?: 3 | 4
  } = {},
): Uint8ClampedArray {
  const { channels = 4 } = options

  if (channels === 3) {
    // Convert RGBA to RGB
    const rgb = new Uint8ClampedArray((imageData.width * imageData.height * 3))
    for (let i = 0, j = 0; i < imageData.data.length; i += 4, j += 3) {
      rgb[j] = imageData.data[i]
      rgb[j + 1] = imageData.data[i + 1]
      rgb[j + 2] = imageData.data[i + 2]
    }
    return rgb
  }

  return imageData.data instanceof Uint8ClampedArray
    ? imageData.data
    : new Uint8ClampedArray(imageData.data)
}
