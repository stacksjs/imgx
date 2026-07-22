import type { ImageData } from './core'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { decode, encode } from './codecs'
import { resize } from './core'
import { imageToSplatHash, splatHashToBase64, splatHashToDataURL } from './splathash'

export type WebImageFormat = 'avif' | 'webp' | 'jpeg' | 'png'

export interface ImageDeliveryOptions {
  input: string | Uint8Array
  outDir: string
  name?: string
  baseUrl?: string
  widths?: readonly number[]
  formats?: readonly WebImageFormat[]
  fallbackFormat?: Extract<WebImageFormat, 'jpeg' | 'png'>
  quality?: number | Partial<Record<WebImageFormat, number>>
  concurrency?: number
  upscale?: boolean
  placeholder?: boolean
}

export interface ImageVariant {
  path: string
  url: string
  width: number
  height: number
  bytes: number
  format: WebImageFormat
  mimeType: string
  cacheKey: string
}

export interface ImageDeliveryManifest {
  source: { width: number, height: number, hash: string }
  variants: ImageVariant[]
  sources: Partial<Record<WebImageFormat, string>>
  fallback: ImageVariant
  placeholder?: { hash: string, dataUrl: string }
}

export interface SelectedImageVariant {
  variant: ImageVariant
  headers: Record<string, string>
}

interface WeightedMediaType {
  type: string
  quality: number
  order: number
}

const formatMimeTypes: Record<WebImageFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

const formatExtensions: Record<WebImageFormat, string> = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg',
  png: 'png',
}

const activeGenerations = new Map<string, Promise<ImageDeliveryManifest>>()

function clampQuality(value: number): number {
  if (!Number.isFinite(value)) throw new TypeError('Image quality must be a finite number')
  return Math.max(1, Math.min(100, Math.round(value)))
}

function getQuality(quality: ImageDeliveryOptions['quality'], format: WebImageFormat): number {
  if (typeof quality === 'number') return clampQuality(quality)
  return clampQuality(quality?.[format] ?? (format === 'png' ? 100 : 82))
}

function normalizeName(input: string | Uint8Array, name?: string): string {
  const requested = name ?? (typeof input === 'string' ? basename(input, extname(input)) : 'image')
  const normalized = requested.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!normalized) throw new TypeError('Image name must contain at least one letter or number')
  return normalized
}

function normalizeBaseUrl(baseUrl = ''): string {
  return baseUrl ? baseUrl.replace(/\/$/, '') : ''
}

function buildUrl(baseUrl: string, filename: string): string {
  return baseUrl ? `${baseUrl}/${encodeURIComponent(filename)}` : filename
}

function canonicalFormats(formats: readonly WebImageFormat[], fallback: WebImageFormat): WebImageFormat[] {
  const unique = [...new Set([...formats, fallback])]
  if (unique.length === 0) throw new TypeError('At least one image format is required')
  return unique
}

export function normalizeImageWidths(widths: readonly number[], sourceWidth: number, upscale = false): number[] {
  if (!Number.isInteger(sourceWidth) || sourceWidth < 1) throw new TypeError('Source width must be a positive integer')

  const normalized = widths.map((width) => {
    if (!Number.isFinite(width) || width < 1) throw new TypeError('Image widths must be positive numbers')
    return Math.round(width)
  })

  if (normalized.length === 0) normalized.push(sourceWidth)
  if (!upscale) normalized.push(sourceWidth)

  const result = [...new Set(normalized)]
    .filter(width => upscale || width <= sourceWidth)
    .sort((a, b) => a - b)

  if (result.length === 0) result.push(sourceWidth)
  return result
}

function parseAccept(accept: string): WeightedMediaType[] {
  return accept
    .split(',')
    .map((entry, order) => {
      const [rawType, ...parameters] = entry.trim().toLowerCase().split(';')
      const q = parameters.find(parameter => parameter.trim().startsWith('q='))?.split('=')[1]
      const parsedQuality = q === undefined ? 1 : Number.parseFloat(q)
      return {
        type: rawType,
        quality: Number.isFinite(parsedQuality) ? Math.max(0, Math.min(1, parsedQuality)) : 0,
        order,
      }
    })
    .filter(entry => entry.type && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.order - b.order)
}

export function negotiateImageFormat(
  accept: string | null | undefined,
  available: readonly WebImageFormat[],
  fallback: WebImageFormat = 'jpeg',
): WebImageFormat {
  const supported = new Set(available)
  if (supported.size === 0) throw new TypeError('At least one available image format is required')

  for (const entry of parseAccept(accept ?? '*/*')) {
    if (entry.type === '*/*' || entry.type === 'image/*') break
    const match = (Object.entries(formatMimeTypes) as Array<[WebImageFormat, string]>)
      .find(([format, mimeType]) => mimeType === entry.type && supported.has(format))
    if (match) return match[0]
  }

  if (supported.has(fallback)) return fallback
  return available[0]
}

async function writeAtomically(path: string, bytes: Uint8Array): Promise<void> {
  const temporaryPath = `${path}.${crypto.randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, bytes)
    await rename(temporaryPath, path)
  }
  catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

async function mapConcurrent<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      output[index] = await work(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return output
}

function hashDelivery(bytes: Uint8Array, options: object): string {
  return createHash('sha256')
    .update(bytes)
    .update('\0')
    .update(JSON.stringify(options))
    .digest('hex')
}

function createSrcset(variants: ImageVariant[]): string {
  return variants.map(variant => `${variant.url} ${variant.width}w`).join(', ')
}

async function generateManifest(options: ImageDeliveryOptions): Promise<ImageDeliveryManifest> {
  const sourceBytes = typeof options.input === 'string'
    ? new Uint8Array(await readFile(options.input))
    : options.input
  const source = await decode(sourceBytes)
  const fallbackFormat = options.fallbackFormat ?? (source.hasAlpha ? 'png' : 'jpeg')
  const formats = canonicalFormats(options.formats ?? ['avif', 'webp'], fallbackFormat)
  const widths = normalizeImageWidths(options.widths ?? [320, 640, 960, 1280, 1920], source.width, options.upscale)
  const concurrency = Math.max(1, Math.min(32, Math.round(options.concurrency ?? 4)))
  const name = normalizeName(options.input, options.name)
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const deliveryOptions = {
    formats,
    widths,
    quality: formats.map(format => [format, getQuality(options.quality, format)]),
    upscale: options.upscale ?? false,
  }
  const sourceHash = createHash('sha256').update(sourceBytes).digest('hex')
  const deliveryHash = hashDelivery(sourceBytes, deliveryOptions).slice(0, 16)

  await mkdir(options.outDir, { recursive: true })

  const tasks = formats.flatMap(format => widths.map(width => ({ format, width })))
  const variants = await mapConcurrent(tasks, concurrency, async ({ format, width }) => {
    const filename = `${name}-${deliveryHash}-${width}.${formatExtensions[format]}`
    const path = join(options.outDir, filename)
    const targetHeight = Math.max(1, Math.round(source.height * (width / source.width)))
    const existing = await stat(path).catch(() => null)
    if (!existing) {
      const image: ImageData = width === source.width ? source : resize(source, { width })
      const encoded = await encode(image, format, { quality: getQuality(options.quality, format) })
      await writeAtomically(path, encoded)
    }
    const file = await stat(path)
    return {
      path,
      url: buildUrl(baseUrl, filename),
      width,
      height: targetHeight,
      bytes: file.size,
      format,
      mimeType: formatMimeTypes[format],
      cacheKey: `${sourceHash}:${deliveryHash}:${format}:${width}`,
    } satisfies ImageVariant
  })

  const sources: ImageDeliveryManifest['sources'] = {}
  for (const format of formats) {
    sources[format] = createSrcset(variants.filter(variant => variant.format === format))
  }

  const fallbackVariants = variants.filter(variant => variant.format === fallbackFormat)
  const fallback = fallbackVariants.at(-1)
  if (!fallback) throw new Error(`No ${fallbackFormat} fallback variant was generated`)

  const placeholder = options.placeholder === false
    ? undefined
    : (() => {
        const hash = imageToSplatHash(source)
        return { hash: splatHashToBase64(hash), dataUrl: splatHashToDataURL(hash) }
      })()

  return {
    source: { width: source.width, height: source.height, hash: sourceHash },
    variants,
    sources,
    fallback,
    placeholder,
  }
}

export async function createImageDeliveryManifest(options: ImageDeliveryOptions): Promise<ImageDeliveryManifest> {
  const sourceBytes = typeof options.input === 'string'
    ? new Uint8Array(await readFile(options.input))
    : options.input
  const key = hashDelivery(sourceBytes, {
    outDir: options.outDir,
    name: options.name,
    baseUrl: options.baseUrl,
    widths: options.widths,
    formats: options.formats,
    fallbackFormat: options.fallbackFormat,
    quality: options.quality,
    upscale: options.upscale,
    placeholder: options.placeholder,
  })
  const active = activeGenerations.get(key)
  if (active) return active

  const generation = generateManifest({ ...options, input: sourceBytes })
  activeGenerations.set(key, generation)
  try {
    return await generation
  }
  finally {
    activeGenerations.delete(key)
  }
}

export function selectImageVariant(
  manifest: ImageDeliveryManifest,
  options: { accept?: string | null, width?: number } = {},
): SelectedImageVariant {
  const formats = [...new Set(manifest.variants.map(variant => variant.format))]
  const format = negotiateImageFormat(options.accept, formats, manifest.fallback.format)
  const candidates = manifest.variants.filter(variant => variant.format === format).sort((a, b) => a.width - b.width)
  if (candidates.length === 0) throw new Error(`Manifest has no ${format} variants`)

  const requestedWidth = Math.max(1, Math.round(options.width ?? candidates.at(-1)!.width))
  const variant = candidates.find(candidate => candidate.width >= requestedWidth) ?? candidates.at(-1)!
  return {
    variant,
    headers: {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(variant.bytes),
      'Content-Type': variant.mimeType,
      'ETag': `"${variant.cacheKey}"`,
      'Vary': 'Accept',
    },
  }
}
