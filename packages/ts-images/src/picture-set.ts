/**
 * Picture sets — build-time responsive asset generation.
 *
 * Given one source image, emit several width variants, each encoded in the
 * SMALLEST format that still clears a quality bar, plus a 16-byte SplatHash
 * placeholder. This is the "small thumbnail + large lightbox source, best of
 * AVIF/WebP, with an instant placeholder" pipeline in one call.
 *
 * The format choice is decode-validated: every candidate is re-decoded and
 * PSNR-checked against the resized source before it can win, so a codec that
 * produces an invalid or low-fidelity bitstream is transparently skipped and
 * the pipeline falls back to a format that passes. As the homegrown AVIF /
 * WebP encoders improve, better formats are picked automatically with no
 * caller change.
 */
import type { ImageData } from './core/image-data'
import { mkdir, writeFile } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { decode, encode } from './codecs'
import { resize } from './core'
import { imageToSplatHash, splatHashToBase64, splatHashToDataURL } from './splathash'
import { debugLog } from './utils'

export interface PictureWidth {
  /** Short label recorded on the emitted variant, e.g. 'sm' or 'lg'. */
  label: string
  /** Target width in pixels. Skipped when wider than the source. */
  width: number
}

export interface PictureSetOptions {
  /** Source image: a file path or an already-decoded RGBA buffer. */
  input: string | Uint8Array
  /** Directory the variant files are written to (created if missing). */
  outDir: string
  /** Basename for emitted files (no extension), e.g. 'note-01'. */
  name: string
  /** Width variants to emit. */
  widths: PictureWidth[]
  /** Candidate formats, tried smallest-wins. Default ['avif', 'webp']. */
  formats?: Array<'avif' | 'webp'>
  /** Encoder quality (0-100). Default 72. */
  quality?: number
  /**
   * Minimum PSNR (dB) a candidate must reach vs the resized source to be
   * eligible. Default 34. Candidates below this are discarded.
   */
  minPsnr?: number
  /**
   * Format used when no candidate clears `minPsnr` (always valid, always
   * available). Default 'jpeg'.
   */
  fallbackFormat?: 'jpeg' | 'png'
  /** Quality for the fallback format. Default 82. */
  fallbackQuality?: number
}

export interface PictureVariant {
  label: string
  /** Path written, relative to nothing — exactly what was passed via outDir. */
  path: string
  width: number
  height: number
  format: string
  size: number
  /** PSNR (dB) of the chosen encode vs the resized source; Infinity for lossless. */
  psnr: number
}

export interface PictureSetResult {
  name: string
  /** Source dimensions after EXIF orientation. */
  width: number
  height: number
  variants: PictureVariant[]
  /** 16-byte SplatHash placeholder, base64 (24 chars). */
  splatHash: string
  /** Ready-to-use `background-image` data URL decoded from the SplatHash. */
  blurDataURL: string
}

const PSNR_CAP = 99

function psnrRGBA(a: Uint8Array | Uint8ClampedArray, b: Uint8Array | Uint8ClampedArray): number {
  if (a.length !== b.length || a.length === 0) return 0
  let se = 0
  let n = 0
  for (let i = 0; i < a.length; i++) {
    if ((i & 3) === 3) continue // ignore alpha
    const d = a[i] - b[i]
    se += d * d
    n++
  }
  if (se === 0) return PSNR_CAP
  return Math.min(PSNR_CAP, 10 * Math.log10((255 * 255) / (se / n)))
}

const EXT: Record<string, string> = { avif: 'avif', webp: 'webp', jpeg: 'jpg', png: 'png' }

/**
 * Encode `image` to `format` and validate it by decoding back. Returns the
 * bytes + measured PSNR, or null if the codec throws or the round-trip fails.
 */
async function tryFormat(
  image: ImageData,
  format: string,
  quality: number,
): Promise<{ bytes: Uint8Array, psnr: number } | null> {
  try {
    const bytes = await encode(image, format, { quality })
    if (!bytes || bytes.length === 0) return null
    const back = await decode(bytes)
    if (back.width !== image.width || back.height !== image.height) return null
    return { bytes, psnr: psnrRGBA(image.data, back.data) }
  }
  catch (err) {
    debugLog('picture-set', `${format} skipped: ${(err as Error).message}`)
    return null
  }
}

/** Generate a responsive picture set for one source image. */
export async function generatePictureSet(options: PictureSetOptions): Promise<PictureSetResult> {
  const {
    input,
    outDir,
    name,
    widths,
    formats = ['avif', 'webp'],
    quality = 72,
    minPsnr = 34,
    fallbackFormat = 'jpeg',
    fallbackQuality = 82,
  } = options

  await mkdir(outDir, { recursive: true })

  const source = typeof input === 'string'
    ? await decode(new Uint8Array(await readFile(input)))
    : await decode(input)

  const splat = imageToSplatHash(source)
  const splatHash = splatHashToBase64(splat)
  const blurDataURL = splatHashToDataURL(splat)

  const variants: PictureVariant[] = []
  for (const { label, width } of widths) {
    const targetW = Math.min(width, source.width)
    const resized = targetW === source.width ? source : resize(source, { width: targetW })

    // Try every candidate format; keep the smallest that clears the gate.
    let best: { format: string, bytes: Uint8Array, psnr: number } | null = null
    for (const format of formats) {
      const r = await tryFormat(resized, format, quality)
      if (!r || r.psnr < minPsnr) continue
      if (!best || r.bytes.length < best.bytes.length) best = { format, ...r }
    }

    // Fallback: guaranteed-valid format when nothing cleared the gate.
    if (!best) {
      const bytes = await encode(resized, fallbackFormat, { quality: fallbackQuality })
      const back = await decode(bytes).catch(() => null)
      best = {
        format: fallbackFormat,
        bytes,
        psnr: back ? psnrRGBA(resized.data, back.data) : 0,
      }
    }

    const filePath = join(outDir, `${name}-${label}.${EXT[best.format] ?? best.format}`)
    await writeFile(filePath, best.bytes)
    variants.push({
      label,
      path: filePath,
      width: resized.width,
      height: resized.height,
      format: best.format,
      size: best.bytes.length,
      psnr: best.psnr,
    })
  }

  return {
    name,
    width: source.width,
    height: source.height,
    variants,
    splatHash,
    blurDataURL,
  }
}
