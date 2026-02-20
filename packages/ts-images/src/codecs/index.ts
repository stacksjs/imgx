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
const _SIGNATURES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  gif: [0x47, 0x49, 0x46], // 'GIF'
  webp: null, // RIFF....WEBP (need special handling)
  bmp: [0x42, 0x4D], // 'BM'
  avif: null, // ftypavif or ftypmif1 (need special handling)
  tiff: null, // II or MM (need special handling)
}

/**
 * Cache for dynamic module imports.
 * In bun, re-importing a broken symlink module can hang forever,
 * so we must cache the result of the first import attempt.
 */
const _codecCache: Record<string, { module: any, available: boolean }> = {}

async function tryImportCodec(name: string): Promise<any | null> {
  if (name in _codecCache) {
    return _codecCache[name].available ? _codecCache[name].module : null
  }
  try {
    const mod = await import(name)
    _codecCache[name] = { module: mod, available: true }
    return mod
  }
  catch {
    _codecCache[name] = { module: null, available: false }
    return null
  }
}

/**
 * Try to get the sharp module. Returns null if not available.
 */
async function getSharp(): Promise<any> {
  const mod = await tryImportCodec('sharp')
  return mod ? mod.default : null
}

/**
 * Decode any image buffer to RGBA ImageData using sharp as fallback
 */
async function decodeWithSharp(buffer: Uint8Array, format: string): Promise<ImageData> {
  const sharpLib = await getSharp()
  if (!sharpLib) {
    throw new Error(`No codec available for ${format}. Install sharp or the ts-${format} package.`)
  }

  // Create a copy of the input buffer to ensure clean ownership
  const inputBuffer = Buffer.from(new Uint8Array(buffer))
  const { data, info } = await sharpLib(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Create a fresh copy of the output data to avoid shared buffer references
  const pixelData = new Uint8Array(data.length)
  pixelData.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))

  const imageData = fromCodecData(
    pixelData,
    info.width,
    info.height,
    { channels: 4 },
  )

  // JPEG never has alpha
  if (format === 'jpeg') {
    imageData.hasAlpha = false
  }

  return imageData
}

/**
 * Encode ImageData to a specific format using sharp as fallback
 */
async function encodeWithSharp(imageData: ImageData, format: string, options: EncodeOptions = {}): Promise<Uint8Array> {
  const sharpLib = await getSharp()
  if (!sharpLib) {
    throw new Error(`No codec available for ${format}. Install sharp or the ts-${format} package.`)
  }

  const rawData = toCodecData(imageData, { channels: 4 })
  // Create a completely independent Buffer copy to avoid bun/sharp shared ArrayBuffer issues
  const inputBuffer = Buffer.allocUnsafe(rawData.length)
  inputBuffer.set(rawData)
  let pipeline = sharpLib(inputBuffer, {
    raw: {
      width: imageData.width,
      height: imageData.height,
      channels: 4,
    },
  })

  switch (format) {
    case 'jpeg':
    case 'jpg':
      pipeline = pipeline.jpeg({
        quality: options.quality ?? 80,
        progressive: options.progressive ?? false,
      })
      break
    case 'png':
      pipeline = pipeline.png({
        effort: options.effort ?? 9,
        progressive: options.progressive ?? false,
      })
      break
    case 'webp':
      pipeline = pipeline.webp({
        quality: options.quality ?? 80,
        lossless: options.lossless ?? false,
        effort: options.effort ?? 6,
      })
      break
    case 'avif':
      pipeline = pipeline.avif({
        quality: options.quality ?? 50,
        lossless: options.lossless ?? false,
        effort: options.effort ?? 4,
      })
      break
    case 'gif':
      pipeline = pipeline.gif()
      break
    case 'bmp':
      // Sharp doesn't support BMP output natively; encode as PNG as fallback
      pipeline = pipeline.png()
      break
    default:
      pipeline = pipeline.png()
      break
  }

  const outputBuffer = await pipeline.toBuffer()
  return new Uint8Array(outputBuffer.buffer, outputBuffer.byteOffset, outputBuffer.byteLength)
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

  // Try sharp first for fast metadata reading
  const sharpLib = await getSharp()
  if (sharpLib) {
    try {
      const metadata = await sharpLib(Buffer.from(buffer)).metadata()
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format,
        channels: metadata.channels || 4,
        bitDepth: (metadata.depth === 16 ? 16 : 8) as 8 | 16,
        hasAlpha: metadata.hasAlpha || false,
        colorSpace: 'srgb',
      }
    }
    catch {
      // Fall through to decode-based approach
    }
  }

  // Fallback: decode and get dimensions
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

// Codec implementations - try ts-* packages first, then fall back to sharp
// IMPORTANT: We use tryImportCodec() to cache import results because in bun,
// re-importing a broken symlink module on second call hangs forever.

async function decodeJpeg(buffer: Uint8Array, options: DecodeOptions): Promise<ImageData> {
  const tsJpeg = await tryImportCodec('ts-jpeg')
  if (tsJpeg) {
    const result = tsJpeg.decode(buffer, {
      colorTransform: options.colorTransform,
      formatAsRGBA: options.formatAsRGBA ?? true,
    })
    const imageData = fromCodecData(result.data, result.width, result.height, { channels: 4 })
    imageData.hasAlpha = false
    return imageData
  }
  return decodeWithSharp(buffer, 'jpeg')
}

async function encodeJpeg(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  const tsJpeg = await tryImportCodec('ts-jpeg')
  if (tsJpeg) {
    const data = toCodecData(imageData, { channels: 4 })
    const result = tsJpeg.encode({
      width: imageData.width,
      height: imageData.height,
      data,
    }, options.quality ?? 80)
    return new Uint8Array(result.data)
  }
  return encodeWithSharp(imageData, 'jpeg', options)
}

async function decodePng(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  const tsPng = await tryImportCodec('ts-png')
  if (tsPng) {
    const result = tsPng.png.sync.read(Buffer.from(buffer))
    return fromCodecData(result.data, result.width, result.height, { channels: 4 })
  }
  return decodeWithSharp(buffer, 'png')
}

async function encodePng(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  const tsPng = await tryImportCodec('ts-png')
  if (tsPng) {
    const data = Buffer.from(toCodecData(imageData, { channels: 4 }))
    const outputBuffer = tsPng.png.sync.write({
      width: imageData.width,
      height: imageData.height,
      data,
    }, {
      deflateLevel: options.effort ?? 9,
    })
    return new Uint8Array(outputBuffer)
  }
  return encodeWithSharp(imageData, 'png', options)
}

async function decodeGif(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  const gif = await tryImportCodec('ts-gif')
  if (gif) {
    const reader = new gif.Reader(Buffer.from(buffer))
    const frameInfo = reader.frameInfo(0)
    const pixels = new Uint8Array(frameInfo.width * frameInfo.height * 4)
    reader.decodeAndBlitFrameRGBA(0, pixels)
    return fromCodecData(pixels, frameInfo.width, frameInfo.height, { channels: 4 })
  }
  return decodeWithSharp(buffer, 'gif')
}

async function encodeGif(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  const gif = await tryImportCodec('ts-gif')
  if (gif) {
    const { indexedPixels, palette } = quantizeImage(imageData)
    const bufSize = imageData.width * imageData.height + 1000
    const buf = Buffer.alloc(bufSize)
    const writer = new gif.Writer(buf, imageData.width, imageData.height, { palette })
    writer.addFrame(0, 0, imageData.width, imageData.height, indexedPixels)
    const finalSize = writer.end()
    return new Uint8Array(buf.slice(0, finalSize))
  }
  return encodeWithSharp(imageData, 'gif', options)
}

async function decodeBmp(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  const bmp = await tryImportCodec('ts-bmp')
  if (bmp) {
    const result = bmp.decode(buffer)
    return fromCodecData(result.data, result.width, result.height, { channels: 4 })
  }
  return decodeWithSharp(buffer, 'bmp')
}

async function encodeBmp(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  const bmp = await tryImportCodec('ts-bmp')
  if (bmp) {
    const data = toCodecData(imageData, { channels: 4 })
    return bmp.encode({
      width: imageData.width,
      height: imageData.height,
      data,
    })
  }
  return encodeWithSharp(imageData, 'bmp', options)
}

async function decodeWebp(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  const webp = await tryImportCodec('ts-webp')
  if (webp) {
    const result = webp.decode(buffer)
    return fromCodecData(result.data, result.width, result.height, { channels: 4 })
  }
  return decodeWithSharp(buffer, 'webp')
}

async function encodeWebp(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  const webp = await tryImportCodec('ts-webp')
  if (webp) {
    const data = toCodecData(imageData, { channels: 4 })
    return webp.encode({
      width: imageData.width,
      height: imageData.height,
      data,
    }, options)
  }
  return encodeWithSharp(imageData, 'webp', options)
}

async function decodeAvif(buffer: Uint8Array, _options: DecodeOptions): Promise<ImageData> {
  const avif = await tryImportCodec('ts-avif')
  if (avif) {
    const result = avif.decode(buffer)
    return fromCodecData(result.data, result.width, result.height, { channels: 4 })
  }
  return decodeWithSharp(buffer, 'avif')
}

async function encodeAvif(imageData: ImageData, options: EncodeOptions): Promise<Uint8Array> {
  const avif = await tryImportCodec('ts-avif')
  if (avif) {
    const data = toCodecData(imageData, { channels: 4 })
    return avif.encode({
      width: imageData.width,
      height: imageData.height,
      data,
    }, options)
  }
  return encodeWithSharp(imageData, 'avif', options)
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
