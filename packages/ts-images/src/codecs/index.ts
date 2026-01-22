import type { ImageData } from '../core/image-data'
import { fromCodecData, toCodecData } from '../core/image-data'

export interface EncodeOptions {
  quality?: number
  progressive?: boolean
  lossless?: boolean
  effort?: number
  // Format-specific options
  [key: string]: any
}

export interface DecodeOptions {
  colorTransform?: boolean
  formatAsRGBA?: boolean
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  channels?: number
  bitDepth?: number
  hasAlpha?: boolean
  colorSpace?: string
}

// Magic bytes for format detection
const SIGNATURES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  gif: [0x47, 0x49, 0x46], // "GIF"
  webp: null, // RIFF....WEBP (need special handling)
  bmp: [0x42, 0x4D], // "BM"
  avif: null, // ftypavif or ftypmif1 (need special handling)
  tiff: null, // II or MM (need special handling)
}

/**
 * Detect image format from buffer
 */
export function detectFormat(buffer: Uint8Array): string | null {
  if (buffer.length < 12) {
    return null
  }

  // Check JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpeg'
  }

  // Check PNG
  if (
    buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4E
    && buffer[3] === 0x47
    && buffer[4] === 0x0D
    && buffer[5] === 0x0A
    && buffer[6] === 0x1A
    && buffer[7] === 0x0A
  ) {
    return 'png'
  }

  // Check GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'gif'
  }

  // Check BMP
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return 'bmp'
  }

  // Check WebP (RIFF....WEBP)
  if (
    buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
    && buffer[8] === 0x57
    && buffer[9] === 0x45
    && buffer[10] === 0x42
    && buffer[11] === 0x50
  ) {
    return 'webp'
  }

  // Check AVIF/HEIF (ftyp box)
  if (
    buffer[4] === 0x66
    && buffer[5] === 0x74
    && buffer[6] === 0x79
    && buffer[7] === 0x70
  ) {
    // Check brand
    const brand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11])
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1' || brand === 'miaf') {
      return 'avif'
    }
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx') {
      return 'heif'
    }
  }

  // Check TIFF (II or MM)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00)
    || (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A)
  ) {
    return 'tiff'
  }

  return null
}

/**
 * Decode an image buffer to ImageData
 */
export async function decode(
  buffer: Uint8Array,
  options: DecodeOptions = {},
): Promise<ImageData> {
  const format = detectFormat(buffer)

  if (!format) {
    throw new Error('Unknown image format')
  }

  switch (format) {
    case 'jpeg':
      return decodeJpeg(buffer, options)
    case 'png':
      return decodePng(buffer, options)
    case 'gif':
      return decodeGif(buffer, options)
    case 'bmp':
      return decodeBmp(buffer, options)
    case 'webp':
      return decodeWebp(buffer, options)
    case 'avif':
      return decodeAvif(buffer, options)
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

/**
 * Encode ImageData to a specific format
 */
export async function encode(
  imageData: ImageData,
  format: string,
  options: EncodeOptions = {},
): Promise<Uint8Array> {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return encodeJpeg(imageData, options)
    case 'png':
      return encodePng(imageData, options)
    case 'gif':
      return encodeGif(imageData, options)
    case 'bmp':
      return encodeBmp(imageData, options)
    case 'webp':
      return encodeWebp(imageData, options)
    case 'avif':
      return encodeAvif(imageData, options)
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

/**
 * Get image metadata without fully decoding
 */
export async function getMetadata(buffer: Uint8Array): Promise<ImageMetadata> {
  const format = detectFormat(buffer)

  if (!format) {
    throw new Error('Unknown image format')
  }

  // For now, decode and get dimensions
  // TODO: Implement lightweight metadata reading for each format
  const imageData = await decode(buffer)

  return {
    width: imageData.width,
    height: imageData.height,
    format,
    channels: 4,
    bitDepth: imageData.bitDepth,
    hasAlpha: imageData.hasAlpha,
    colorSpace: imageData.colorSpace,
  }
}

// Codec implementations - these will be dynamically imported when available

async function decodeJpeg(buffer: Uint8Array, options: DecodeOptions): Promise<ImageData> {
  try {
    const tsJpeg = await import('ts-jpeg')
    const result = tsJpeg.decode(buffer, {
      colorTransform: options.colorTransform,
      formatAsRGBA: options.formatAsRGBA ?? true,
    })
    // JPEG never has alpha - use channels: 3 to indicate no alpha even though data is RGBA
    const imageData = fromCodecData(result.data, result.width, result.height, { channels: 4 })
    imageData.hasAlpha = false // JPEG does not support alpha
    return imageData
  }
  catch {
    throw new Error('JPEG codec (ts-jpeg) not available. Install with: bun add ts-jpeg')
  }
}

async function encodeJpeg(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  try {
    const tsJpeg = await import('ts-jpeg')
    const data = toCodecData(imageData, { channels: 4 })
    const result = tsJpeg.encode({
      width: imageData.width,
      height: imageData.height,
      data,
    }, options.quality ?? 80)
    return new Uint8Array(result.data)
  }
  catch {
    throw new Error('JPEG codec (ts-jpeg) not available. Install with: bun add ts-jpeg')
  }
}

async function decodePng(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  try {
    const { png } = await import('ts-png')
    const result = png.sync.read(Buffer.from(buffer))
    return fromCodecData(result.data, result.width, result.height, { channels: 4 })
  }
  catch (err) {
    throw new Error(`PNG codec (ts-png) not available: ${err}`)
  }
}

async function encodePng(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  try {
    const { png } = await import('ts-png')
    const data = Buffer.from(toCodecData(imageData, { channels: 4 }))
    const outputBuffer = png.sync.write({
      width: imageData.width,
      height: imageData.height,
      data,
    }, {
      deflateLevel: options.effort ?? 9,
    })
    return new Uint8Array(outputBuffer)
  }
  catch (err) {
    throw new Error(`PNG codec (ts-png) not available: ${err}`)
  }
}

async function decodeGif(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  try {
    const gif = await import('ts-gif')
    const reader = new gif.Reader(Buffer.from(buffer))
    const frameInfo = reader.frameInfo(0)
    const pixels = new Uint8Array(frameInfo.width * frameInfo.height * 4)
    reader.decodeAndBlitFrameRGBA(0, pixels)
    return fromCodecData(pixels, frameInfo.width, frameInfo.height, { channels: 4 })
  }
  catch {
    throw new Error('GIF codec (ts-gif) not available. Install with: bun add ts-gif')
  }
}

async function encodeGif(imageData: ImageData, _options: EncodeOptions): Promise<Uint8Array> {
  try {
    const gif = await import('ts-gif')

    // Convert RGBA to indexed colors (simple quantization)
    const { indexedPixels, palette } = quantizeImage(imageData)

    const bufSize = imageData.width * imageData.height + 1000
    const buf = Buffer.alloc(bufSize)

    const writer = new gif.Writer(buf, imageData.width, imageData.height, { palette })
    writer.addFrame(0, 0, imageData.width, imageData.height, indexedPixels)
    const finalSize = writer.end()

    return new Uint8Array(buf.slice(0, finalSize))
  }
  catch {
    throw new Error('GIF codec (ts-gif) not available. Install with: bun add ts-gif')
  }
}

async function decodeBmp(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  try {
    const bmp = await import('ts-bmp')
    const result = bmp.decode(buffer)
    return fromCodecData(result.data, result.width, result.height, { channels: 4 })
  }
  catch {
    throw new Error('BMP codec (ts-bmp) not available. Install with: bun add ts-bmp')
  }
}

async function encodeBmp(imageData: ImageData, _options: EncodeOptions): Promise<Uint8Array> {
  try {
    const bmp = await import('ts-bmp')
    const data = toCodecData(imageData, { channels: 4 })
    return bmp.encode({
      width: imageData.width,
      height: imageData.height,
      data,
    })
  }
  catch {
    throw new Error('BMP codec (ts-bmp) not available. Install with: bun add ts-bmp')
  }
}

async function decodeWebp(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  try {
    const webp = await import('ts-webp')
    const result = webp.decode(buffer)
    return fromCodecData(result.data, result.width, result.height, { channels: 4 })
  }
  catch {
    throw new Error('WebP codec (ts-webp) not available. Install with: bun add ts-webp')
  }
}

async function encodeWebp(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  try {
    const webp = await import('ts-webp')
    const data = toCodecData(imageData, { channels: 4 })
    return webp.encode({
      width: imageData.width,
      height: imageData.height,
      data,
    }, options)
  }
  catch {
    throw new Error('WebP codec (ts-webp) not available. Install with: bun add ts-webp')
  }
}

async function decodeAvif(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  try {
    const avif = await import('ts-avif')
    const result = avif.decode(buffer)
    return fromCodecData(result.data, result.width, result.height, { channels: 4 })
  }
  catch {
    throw new Error('AVIF codec (ts-avif) not available. Install with: bun add ts-avif')
  }
}

async function encodeAvif(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  try {
    const avif = await import('ts-avif')
    const data = toCodecData(imageData, { channels: 4 })
    return avif.encode({
      width: imageData.width,
      height: imageData.height,
      data,
    }, options)
  }
  catch {
    throw new Error('AVIF codec (ts-avif) not available. Install with: bun add ts-avif')
  }
}

// Simple color quantization for GIF encoding
function quantizeImage(imageData: ImageData): { indexedPixels: Uint8Array, palette: number[] } {
  // Build a simple 256-color palette using color cube
  const palette: number[] = []

  // Use a 6x6x6 color cube (216 colors) plus 40 grayscale
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        const red = Math.round(r * 255 / 5)
        const green = Math.round(g * 255 / 5)
        const blue = Math.round(b * 255 / 5)
        palette.push((red << 16) | (green << 8) | blue)
      }
    }
  }

  // Add grayscale values
  for (let i = 0; i < 40; i++) {
    const gray = Math.round(i * 255 / 39)
    palette.push((gray << 16) | (gray << 8) | gray)
  }

  // Map each pixel to the closest palette index
  const indexedPixels = new Uint8Array(imageData.width * imageData.height)

  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
    const r = imageData.data[i]
    const g = imageData.data[i + 1]
    const b = imageData.data[i + 2]

    // Find closest color in palette (using color cube mapping)
    const ri = Math.round(r * 5 / 255)
    const gi = Math.round(g * 5 / 255)
    const bi = Math.round(b * 5 / 255)

    indexedPixels[j] = ri * 36 + gi * 6 + bi
  }

  return { indexedPixels, palette }
}
