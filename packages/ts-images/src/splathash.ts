/**
 * SplatHash: a sixteen-byte summary of an image, and the code to read one.
 *
 * Exported as its own entry point (`ts-images/splathash`) as well as from the
 * root, because the two halves run in different places. Producing a hash
 * happens at build time next to the encoders, which are native and Node-only;
 * *decoding* one happens in a browser, where a placeholder has to be painted
 * before the real file arrives. Importing the root to get the decoder drags
 * the codecs in with it, so a bundler either fails on them or ships them.
 *
 * Nothing here imports anything but a type, which is what makes that safe.
 */
/**
 * SplatHash — compact image placeholders in 16 bytes.
 *
 * Ported to TypeScript for ts-images from the reference implementation by
 * junevm (https://github.com/junevm/splathash), MIT-licensed
 * (Copyright (c) 2025 junevm). Full credit to the original author; this is
 * a faithful port adapted to ts-images' `ImageData` plus a couple of
 * convenience helpers (base64 + placeholder data-URL).
 *
 * An image is decomposed into a background colour (Mean) and six Gaussian
 * blobs (Splats):
 *   - 3 Baryons: full-colour splats for dominant features
 *   - 3 Leptons: luma-only splats for texture and detail
 * Splat positions are found by separable 2-D Gaussian correlation (matching
 * pursuit); ridge regression then refines all weights together. All maths
 * happens in Oklab. The hash fits into exactly 128 bits, which makes it a
 * near-free inline placeholder you can paint before the real image loads.
 */
import type { ImageData } from './core/image-data'

export const SPLATHASH_TARGET_SIZE = 32
const RIDGE_LAMBDA = 0.001
const SIGMA_TABLE = [0.025, 0.1, 0.2, 0.35]

const GAUSS_TABLE_MAX = 1923 // max dsq = 31² + 31² = 1922 for a 32×32 grid

export interface Splat {
  x: number
  y: number
  sigma: number
  l: number
  a: number
  b: number
  isLepton: boolean
}

export interface DecodedSplatImage {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

// ── Package-level precomputed look-up tables ──────────────────────────────

// gaussLUT[si][dsq] = exp(-dsq / (2·σᵢ²·W²))
const gaussLUT: Float64Array[] = [
  new Float64Array(GAUSS_TABLE_MAX),
  new Float64Array(GAUSS_TABLE_MAX),
  new Float64Array(GAUSS_TABLE_MAX),
  new Float64Array(GAUSS_TABLE_MAX),
]

const gaussKernel1D: Float64Array[] = Array.from({ length: 4 })
const kernelHW: number[] = [0, 0, 0, 0]
// gaussPow[si] = (Σ_{d=-hw}^{hw} k[d]²)² ≈ Σ_{dx,dy} G(dx,dy)² (interior)
const gaussPow: number[] = [0, 0, 0, 0]

// linToSrgbLUT[i] = sRGB-gamma(i / 1023) for i = 0 .. 1023.
const linToSrgbLUT = new Float64Array(1024)
// srgbLinLUT[v] = linear-light(v / 255) for v = 0 .. 255.
const srgbLinLUT = new Float64Array(256)
// cbrtLUT[i] = cbrt(i / 1024) for i = 0 .. 1024.
const cbrtLUT = new Float64Array(1025)

function linToSrgbScalar(c: number): number {
  if (c <= 0.0031308) return 12.92 * c
  if (c < 0) return 0
  return 1.055 * c ** (1.0 / 2.4) - 0.055
}

;(function initLUTs() {
  const W = SPLATHASH_TARGET_SIZE
  const W2 = W * W

  for (let si = 0; si < 4; si++) {
    const sigma = SIGMA_TABLE[si]
    const scale2 = 2.0 * sigma * sigma * W2
    for (let dsq = 0; dsq < GAUSS_TABLE_MAX; dsq++) {
      let v = Math.exp(-dsq / scale2)
      if (v < 1e-7) v = 0
      gaussLUT[si][dsq] = v
    }
    // Build 1-D half-kernel.
    let hw = 0
    for (let d = 0; d < W; d++) {
      if (gaussLUT[si][d * d] < 1e-7) break
      hw = d
    }
    kernelHW[si] = hw
    const kern = new Float64Array(hw + 1)
    for (let d = 0; d <= hw; d++) kern[d] = gaussLUT[si][d * d]
    gaussKernel1D[si] = kern
    // Normalization factor gg = (Σ_d k[d]²)²
    let sum1D = 0.0
    for (let d = -hw; d <= hw; d++) {
      const v = kern[Math.abs(d)]
      sum1D += v * v
    }
    gaussPow[si] = sum1D * sum1D
  }

  // sRGB → linear LUT (8-bit input, full-range).
  for (let v = 0; v < 256; v++) {
    const c = v / 255.0
    srgbLinLUT[v] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  // linear → sRGB gamma LUT (1024 steps over [0, 1]).
  for (let i = 0; i < 1024; i++) linToSrgbLUT[i] = linToSrgbScalar(i / 1023.0)
  // Cube-root LUT for [0, 1].
  for (let i = 0; i <= 1024; i++) cbrtLUT[i] = Math.cbrt(i / 1024.0)
})()

function cbrtFast(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return cbrtLUT[1024]
  return cbrtLUT[Math.round(x * 1024.0)]
}

function linToSrgbFast(c: number): number {
  if (c <= 0) return 0
  if (c >= 1) return 1
  return linToSrgbLUT[Math.round(c * 1023.0)]
}

function sigmaIndex(sigma: number): number {
  let si = 0
  let minD = Math.abs(SIGMA_TABLE[0] - sigma)
  for (let i = 1; i < 4; i++) {
    const d = Math.abs(SIGMA_TABLE[i] - sigma)
    if (d < minD) {
      minD = d
      si = i
    }
  }
  return si
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Encode a raw RGBA buffer into a 16-byte SplatHash.
 */
export function rgbaToSplatHash(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const grid = imageToOklabGrid(rgba, width, height, SPLATHASH_TARGET_SIZE, SPLATHASH_TARGET_SIZE)

  // Mean, quantised immediately so residuals match the decoder.
  let meanL = 0
  let meanA = 0
  let meanB = 0
  const n = SPLATHASH_TARGET_SIZE * SPLATHASH_TARGET_SIZE
  for (let i = 0; i < n; i++) {
    meanL += grid[i * 3]
    meanA += grid[i * 3 + 1]
    meanB += grid[i * 3 + 2]
  }
  meanL /= n
  meanA /= n
  meanB /= n
  const pMean = packMean(meanL, meanA, meanB)
  const uMean = unpackMean(pMean)
  meanL = uMean.l
  meanA = uMean.a
  meanB = uMean.b

  const resL = new Float64Array(n)
  const resA = new Float64Array(n)
  const resB = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    resL[i] = grid[i * 3] - meanL
    resA[i] = grid[i * 3 + 1] - meanA
    resB[i] = grid[i * 3 + 2] - meanB
  }

  const scratch = new SearchScratch()
  let basis = findAllSplats(resL, resA, resB, SPLATHASH_TARGET_SIZE, SPLATHASH_TARGET_SIZE, scratch, 6)
  if (basis.length > 0)
    basis = solveWeights(basis, grid, meanL, meanA, meanB, SPLATHASH_TARGET_SIZE, SPLATHASH_TARGET_SIZE)

  return packHash(pMean, basis)
}

/** Convenience wrapper for ts-images' `ImageData`. */
export function imageToSplatHash(image: ImageData): Uint8Array {
  return rgbaToSplatHash(image.data, image.width, image.height)
}

/**
 * Decode a 16-byte SplatHash back into a 32×32 RGBA preview.
 */
export function splatHashToRgba(hash: Uint8Array): DecodedSplatImage {
  if (hash.length !== 16) throw new Error('ts-images: invalid SplatHash — must be 16 bytes')

  const { meanL, meanA, meanB, splats } = unpackHash(hash)
  const w = SPLATHASH_TARGET_SIZE
  const h = SPLATHASH_TARGET_SIZE
  const grid = new Float64Array(w * h * 3)
  for (let i = 0; i < grid.length; i += 3) {
    grid[i] = meanL
    grid[i + 1] = meanA
    grid[i + 2] = meanB
  }
  for (const s of splats) addSplatToGrid(grid, s, w, h)

  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3
      const { r, g, b: bl } = oklabToSrgb(grid[idx], grid[idx + 1], grid[idx + 2])
      const pIdx = (y * w + x) * 4
      rgba[pIdx] = clampi(Math.round(r * 255 + 0.5), 0, 255)
      rgba[pIdx + 1] = clampi(Math.round(g * 255 + 0.5), 0, 255)
      rgba[pIdx + 2] = clampi(Math.round(bl * 255 + 0.5), 0, 255)
      rgba[pIdx + 3] = 255
    }
  }
  return { width: w, height: h, rgba }
}

// ── base64 helpers (transport-friendly 24-char string) ─────────────────────

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Encode a SplatHash as a compact base64 string (24 chars incl. padding). */
export function splatHashToBase64(hash: Uint8Array): string {
  let out = ''
  for (let i = 0; i < hash.length; i += 3) {
    const b0 = hash[i]
    const b1 = i + 1 < hash.length ? hash[i + 1] : 0
    const b2 = i + 2 < hash.length ? hash[i + 2] : 0
    out += B64[b0 >> 2]
    out += B64[((b0 & 3) << 4) | (b1 >> 4)]
    out += i + 1 < hash.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '='
    out += i + 2 < hash.length ? B64[b2 & 63] : '='
  }
  return out
}

/** Decode a base64 SplatHash string back to its 16 bytes. */
/** A SplatHash is exactly this many bytes; anything else is not one. */
export const SPLATHASH_BYTES = 16

/**
 * Decode a base64 SplatHash.
 *
 * Throws on anything that does not decode to exactly `SPLATHASH_BYTES`.
 * Non-base64 characters were skipped silently, so a truncated or corrupted
 * value produced a short buffer, and the renderer downstream read it as though
 * it were a hash - painting noise into the frame where a placeholder should
 * be. That is worse than no placeholder: it looks like a decoding bug in the
 * image itself rather than a bad string handed in.
 */
export function splatHashFromBase64(str: string): Uint8Array {
  const clean = str.replace(/=+$/, '')
  const bytes: number[] = []
  let bits = 0
  let acc = 0
  for (const ch of clean) {
    const v = B64.indexOf(ch)
    if (v < 0) continue
    acc = (acc << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((acc >> bits) & 0xFF)
    }
  }

  if (bytes.length !== SPLATHASH_BYTES)
    throw new Error(`Not a SplatHash: decoded ${bytes.length} bytes, expected ${SPLATHASH_BYTES}`)

  return new Uint8Array(bytes)
}

/**
 * Decode a SplatHash directly to a CSS-ready data URL you can drop into a
 * `background-image` as an instant, zero-JS placeholder. Produces a tiny
 * BMP (browsers scale it smoothly with `image-rendering: auto`), so there
 * is no dependency on a PNG/WebP encoder. Typical output is ~200 bytes.
 */
export function splatHashToDataURL(hash: Uint8Array): string {
  const { width, height, rgba } = splatHashToRgba(hash)
  return `data:image/bmp;base64,${bmpBase64(width, height, rgba)}`
}

// ── Solver math ────────────────────────────────────────────────────────────

function solveWeights(
  basis: Splat[],
  grid: Float64Array,
  meanL: number,
  meanA: number,
  meanB: number,
  w: number,
  h: number,
): Splat[] {
  const nTotal = basis.length
  const M = w * h
  const tL = new Float64Array(M)
  const tA = new Float64Array(M)
  const tB = new Float64Array(M)
  for (let i = 0; i < M; i++) {
    tL[i] = grid[i * 3] - meanL
    tA[i] = grid[i * 3 + 1] - meanA
    tB[i] = grid[i * 3 + 2] - meanB
  }

  const activations = basis.map(s => computeBasisMap(s, w, h))
  const nBaryons = Math.min(nTotal, 3)
  const xL = solveChannel(activations, tL, nTotal, RIDGE_LAMBDA)
  const xA = solveChannel(activations.slice(0, nBaryons), tA, nBaryons, RIDGE_LAMBDA)
  const xB = solveChannel(activations.slice(0, nBaryons), tB, nBaryons, RIDGE_LAMBDA)

  const out: Splat[] = []
  for (let i = 0; i < nTotal; i++) {
    out.push({
      ...basis[i],
      l: xL[i],
      a: i < 3 ? xA[i] : 0,
      b: i < 3 ? xB[i] : 0,
    })
  }
  return out
}

function solveChannel(activations: Float64Array[], target: Float64Array, n: number, lambda: number): Float64Array {
  if (n === 0) return new Float64Array(0)
  const m = target.length
  const ata = new Float64Array(n * n)
  const atb = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const rowI = activations[i]
    for (let j = i; j < n; j++) {
      let sum = 0.0
      const rowJ = activations[j]
      for (let p = 0; p < m; p++) sum += rowI[p] * rowJ[p]
      ata[i * n + j] = sum
      ata[j * n + i] = sum
    }
    let sumB = 0.0
    for (let p = 0; p < m; p++) sumB += rowI[p] * target[p]
    atb[i] = sumB
  }
  for (let i = 0; i < n; i++) ata[i * n + i] += lambda
  return solveLinearSystem(ata, atb, n)
}

function solveLinearSystem(mat: Float64Array, vec: Float64Array, n: number): Float64Array {
  const a = new Float64Array(mat)
  const b = new Float64Array(vec)
  for (let k = 0; k < n - 1; k++) {
    for (let i = k + 1; i < n; i++) {
      const factor = a[i * n + k] / a[k * n + k]
      for (let j = k; j < n; j++) a[i * n + j] -= factor * a[k * n + j]
      b[i] -= factor * b[k]
    }
  }
  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0.0
    for (let j = i + 1; j < n; j++) sum += a[i * n + j] * x[j]
    x[i] = (b[i] - sum) / a[i * n + i]
  }
  return x
}

function computeBasisMap(s: Splat, w: number, h: number): Float64Array {
  const out = new Float64Array(w * h)
  const si = sigmaIndex(s.sigma)
  const hw = kernelHW[si]
  const cx = Math.floor(s.x * w)
  const cy = Math.floor(s.y * h)
  const y0 = clampi(cy - hw, 0, h - 1)
  const y1 = clampi(cy + hw, 0, h - 1)
  const x0 = clampi(cx - hw, 0, w - 1)
  const x1 = clampi(cx + hw, 0, w - 1)
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy
    const rowBase = y * w
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dsq = dx * dx + dy * dy
      if (dsq < GAUSS_TABLE_MAX) out[rowBase + x] = gaussLUT[si][dsq]
    }
  }
  return out
}

// ── Greedy search: sequential matching pursuit ──────────────────────────────

class SearchScratch {
  readonly tmpL = new Float64Array(SPLATHASH_TARGET_SIZE * SPLATHASH_TARGET_SIZE)
  readonly tmpA = new Float64Array(SPLATHASH_TARGET_SIZE * SPLATHASH_TARGET_SIZE)
  readonly tmpB = new Float64Array(SPLATHASH_TARGET_SIZE * SPLATHASH_TARGET_SIZE)
  readonly scoreMap = new Float64Array(SPLATHASH_TARGET_SIZE * SPLATHASH_TARGET_SIZE)
  readonly sigmaMap = new Int8Array(SPLATHASH_TARGET_SIZE * SPLATHASH_TARGET_SIZE)
}

function findAllSplats(
  resL: Float64Array,
  resA: Float64Array,
  resB: Float64Array,
  w: number,
  h: number,
  sc: SearchScratch,
  nSplats: number,
): Splat[] {
  const splats: Splat[] = []

  while (splats.length < nSplats) {
    const isBaryon = splats.length < 3
    sc.scoreMap.fill(-1)
    sc.sigmaMap.fill(-1)

    for (let si = 0; si < 4; si++) {
      const kern = gaussKernel1D[si]
      const hw = kernelHW[si]
      const invGG = 1.0 / gaussPow[si]

      // Horizontal pass (zero-padding).
      for (let y = 0; y < h; y++) {
        const rowOff = y * w
        for (let x = 0; x < w; x++) {
          let sL = kern[0] * resL[rowOff + x]
          let sA = kern[0] * resA[rowOff + x]
          let sB = kern[0] * resB[rowOff + x]
          for (let d = 1; d <= hw; d++) {
            const k = kern[d]
            const xl = x - d
            if (xl >= 0) {
              sL += k * resL[rowOff + xl]
              if (isBaryon) {
                sA += k * resA[rowOff + xl]
                sB += k * resB[rowOff + xl]
              }
            }
            const xr = x + d
            if (xr < w) {
              sL += k * resL[rowOff + xr]
              if (isBaryon) {
                sA += k * resA[rowOff + xr]
                sB += k * resB[rowOff + xr]
              }
            }
          }
          sc.tmpL[rowOff + x] = sL
          if (isBaryon) {
            sc.tmpA[rowOff + x] = sA
            sc.tmpB[rowOff + x] = sB
          }
        }
      }

      // Vertical pass (zero-padding) + score update.
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          let sL = kern[0] * sc.tmpL[y * w + x]
          let sA = kern[0] * sc.tmpA[y * w + x]
          let sB = kern[0] * sc.tmpB[y * w + x]
          for (let d = 1; d <= hw; d++) {
            const k = kern[d]
            const yu = y - d
            if (yu >= 0) {
              sL += k * sc.tmpL[yu * w + x]
              if (isBaryon) {
                sA += k * sc.tmpA[yu * w + x]
                sB += k * sc.tmpB[yu * w + x]
              }
            }
            const yd = y + d
            if (yd < h) {
              sL += k * sc.tmpL[yd * w + x]
              if (isBaryon) {
                sA += k * sc.tmpA[yd * w + x]
                sB += k * sc.tmpB[yd * w + x]
              }
            }
          }
          const i = y * w + x
          const score = isBaryon ? (sL * sL + sA * sA + sB * sB) * invGG : sL * sL * invGG
          if (score > sc.scoreMap[i]) {
            sc.scoreMap[i] = score
            sc.sigmaMap[i] = si
          }
        }
      }
    }

    // Best pixel.
    let bestScore = -1.0
    let bestIdx = -1
    for (let i = 0; i < w * h; i++) {
      if (sc.scoreMap[i] > bestScore) {
        bestScore = sc.scoreMap[i]
        bestIdx = i
      }
    }
    if (bestIdx < 0 || bestScore < 1e-9) break

    const bx = bestIdx % w
    const by = Math.floor(bestIdx / w)
    const si = sc.sigmaMap[bestIdx]
    const kern = gaussKernel1D[si]
    const hw = kernelHW[si]
    const gg = gaussPow[si]

    let dotL = 0
    let dotA = 0
    let dotB = 0
    for (let dy = -hw; dy <= hw; dy++) {
      const yy = by + dy
      if (yy < 0 || yy >= h) continue
      const ky = kern[Math.abs(dy)]
      for (let dx = -hw; dx <= hw; dx++) {
        const xx = bx + dx
        if (xx < 0 || xx >= w) continue
        const kv = ky * kern[Math.abs(dx)]
        const off = yy * w + xx
        dotL += kv * resL[off]
        dotA += kv * resA[off]
        dotB += kv * resB[off]
      }
    }
    const invGG = 1.0 / gg
    const splat: Splat = {
      x: bx / w,
      y: by / h,
      sigma: SIGMA_TABLE[si],
      l: dotL * invGG,
      a: dotA * invGG,
      b: dotB * invGG,
      isLepton: !isBaryon,
    }
    splats.push(splat)

    // Subtract splat footprint from residuals.
    const y0 = clampi(by - hw, 0, h - 1)
    const y1 = clampi(by + hw, 0, h - 1)
    const x0 = clampi(bx - hw, 0, w - 1)
    const x1 = clampi(bx + hw, 0, w - 1)
    for (let y = y0; y <= y1; y++) {
      const dy = y - by
      const rowBase = y * w
      for (let x = x0; x <= x1; x++) {
        const dx = x - bx
        const dsq = dx * dx + dy * dy
        if (dsq >= GAUSS_TABLE_MAX) continue
        const wVal = gaussLUT[si][dsq]
        if (wVal === 0) continue
        const off = rowBase + x
        resL[off] -= splat.l * wVal
        resA[off] -= splat.a * wVal
        resB[off] -= splat.b * wVal
      }
    }
  }
  return splats
}

// ── Bit packing (128 bits: 16-bit mean + 3×22-bit baryons + 3×15-bit leptons + 1 reserved) ──

function packHash(mean: number, splats: Splat[]): Uint8Array {
  const bw = new BitStream()
  bw.write(mean, 16)

  let count = 0
  for (const s of splats) {
    if (s.isLepton) continue
    if (count >= 3) break
    bw.write(clampi(Math.floor(s.x * 15.0 + 0.5), 0, 15), 4)
    bw.write(clampi(Math.floor(s.y * 15.0 + 0.5), 0, 15), 4)
    bw.write(sigmaIndex(s.sigma), 2)
    bw.write(quant(s.l, -0.8, 0.8, 4), 4)
    bw.write(quant(s.a, -0.4, 0.4, 4), 4)
    bw.write(quant(s.b, -0.4, 0.4, 4), 4)
    count++
  }
  while (count < 3) {
    bw.write(0, 22)
    count++
  }

  count = 0
  for (const s of splats) {
    if (!s.isLepton) continue
    if (count >= 3) break
    bw.write(clampi(Math.floor(s.x * 15.0 + 0.5), 0, 15), 4)
    bw.write(clampi(Math.floor(s.y * 15.0 + 0.5), 0, 15), 4)
    bw.write(sigmaIndex(s.sigma), 2)
    bw.write(quant(s.l, -0.8, 0.8, 5), 5)
    count++
  }
  while (count < 3) {
    bw.write(0, 15)
    count++
  }

  bw.write(0, 1) // reserved
  return bw.getBytes()
}

function unpackHash(hash: Uint8Array) {
  const br = new BitReader(hash)
  const { l, a, b } = unpackMean(br.read(16))
  const splats: Splat[] = []

  for (let i = 0; i < 3; i++) {
    const xi = br.read(4)
    const yi = br.read(4)
    const sigI = br.read(2)
    const lQ = br.read(4)
    const aQ = br.read(4)
    const bQ = br.read(4)
    if (xi === 0 && yi === 0 && lQ === 0 && aQ === 0 && bQ === 0) continue
    splats.push({
      x: xi / 15.0,
      y: yi / 15.0,
      sigma: SIGMA_TABLE[sigI],
      l: unquant(lQ, -0.8, 0.8, 4),
      a: unquant(aQ, -0.4, 0.4, 4),
      b: unquant(bQ, -0.4, 0.4, 4),
      isLepton: false,
    })
  }

  for (let i = 0; i < 3; i++) {
    const xi = br.read(4)
    const yi = br.read(4)
    const sigI = br.read(2)
    const lQ = br.read(5)
    if (xi === 0 && yi === 0 && lQ === 0) continue
    splats.push({
      x: xi / 15.0,
      y: yi / 15.0,
      sigma: SIGMA_TABLE[sigI],
      l: unquant(lQ, -0.8, 0.8, 5),
      a: 0,
      b: 0,
      isLepton: true,
    })
  }

  return { meanL: l, meanA: a, meanB: b, splats }
}

class BitStream {
  private buf: number[] = []
  private acc = 0n
  private n = 0

  write(val: number, bits: number): void {
    this.acc = (this.acc << BigInt(bits)) | BigInt(val)
    this.n += bits
    while (this.n >= 8) {
      const shift = BigInt(this.n - 8)
      this.buf.push(Number((this.acc >> shift) & 0xFFn))
      this.n -= 8
    }
  }

  getBytes(): Uint8Array {
    if (this.n > 0) this.buf.push(Number((this.acc << BigInt(8 - this.n)) & 0xFFn))
    return new Uint8Array(this.buf)
  }
}

class BitReader {
  private pos = 0
  private rem = 0
  private curr = 0
  constructor(private readonly data: Uint8Array) {}

  read(bits: number): number {
    let val = 0
    let bitsRemaining = bits
    while (bitsRemaining > 0) {
      if (this.rem === 0) {
        if (this.pos >= this.data.length) return val << bitsRemaining
        this.curr = this.data[this.pos++]
        this.rem = 8
      }
      const take = Math.min(this.rem, bitsRemaining)
      const shift = this.rem - take
      const mask = (1 << take) - 1
      val = (val << take) | ((this.curr >> shift) & mask)
      this.rem -= take
      bitsRemaining -= take
    }
    return val
  }
}

// ── Quantization ────────────────────────────────────────────────────────────

function packMean(l: number, a: number, b: number): number {
  const li = clampi(Math.floor(l * 63.5), 0, 63)
  const ai = clampi(Math.floor(((a + 0.2) / 0.4) * 31.5), 0, 31)
  const bi = clampi(Math.floor(((b + 0.2) / 0.4) * 31.5), 0, 31)
  return (li << 10) | (ai << 5) | bi
}

function unpackMean(p: number) {
  const li = (p >> 10) & 0x3F
  const ai = (p >> 5) & 0x1F
  const bi = p & 0x1F
  return { l: li / 63.0, a: (ai / 31.0) * 0.4 - 0.2, b: (bi / 31.0) * 0.4 - 0.2 }
}

function quant(v: number, min: number, max: number, bits: number): number {
  const steps = (1 << bits) - 1
  return clampi(Math.floor(((v - min) / (max - min)) * steps + 0.5), 0, steps)
}

function unquant(v: number, min: number, max: number, bits: number): number {
  const steps = (1 << bits) - 1
  return (v / steps) * (max - min) + min
}

// ── Splat rendering & colour ─────────────────────────────────────────────────

function addSplatToGrid(grid: Float64Array, s: Splat, w: number, h: number): void {
  const si = sigmaIndex(s.sigma)
  const hw = kernelHW[si]
  const cx = Math.floor(s.x * w)
  const cy = Math.floor(s.y * h)
  const y0 = clampi(cy - hw, 0, h - 1)
  const y1 = clampi(cy + hw, 0, h - 1)
  const x0 = clampi(cx - hw, 0, w - 1)
  const x1 = clampi(cx + hw, 0, w - 1)
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy
    const rowBase = y * w * 3
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dsq = dx * dx + dy * dy
      if (dsq >= GAUSS_TABLE_MAX) continue
      const wVal = gaussLUT[si][dsq]
      if (wVal === 0) continue
      const idx = rowBase + x * 3
      grid[idx] += s.l * wVal
      grid[idx + 1] += s.a * wVal
      grid[idx + 2] += s.b * wVal
    }
  }
}

function imageToOklabGrid(
  rgba: Uint8ClampedArray | Uint8Array,
  srcW: number,
  srcH: number,
  w: number,
  h: number,
): Float64Array {
  const out = new Float64Array(w * h * 3)
  for (let y = 0; y < h; y++) {
    const sy = ((y * srcH + Math.floor(srcH / 2)) / h) | 0
    for (let x = 0; x < w; x++) {
      const sx = ((x * srcW + Math.floor(srcW / 2)) / w) | 0
      const off = (sy * srcW + sx) * 4
      const r = srgbLinLUT[rgba[off]]
      const g = srgbLinLUT[rgba[off + 1]]
      const b = srgbLinLUT[rgba[off + 2]]
      const { l, a, b: bb } = srgbLinToOklab(r, g, b)
      const idx = (y * w + x) * 3
      out[idx] = l
      out[idx + 1] = a
      out[idx + 2] = bb
    }
  }
  return out
}

function srgbLinToOklab(r: number, g: number, b: number) {
  const l1 = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m1 = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s1 = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const l_ = cbrtFast(l1)
  const m_ = cbrtFast(m1)
  const s_ = cbrtFast(s1)
  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

function oklabToSrgb(l: number, a: number, b: number) {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b
  const l3 = l_ * l_ * l_
  const m3 = m_ * m_ * m_
  const s3 = s_ * s_ * s_
  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
  return { r: linToSrgbFast(r), g: linToSrgbFast(g), b: linToSrgbFast(bl) }
}

// ── Tiny BMP encoder for the placeholder data URL (BGR, bottom-up, 24bpp) ──

function bmpBase64(w: number, h: number, rgba: Uint8ClampedArray): string {
  const rowStride = (w * 3 + 3) & ~3 // rows padded to 4 bytes
  const pixelBytes = rowStride * h
  const fileSize = 54 + pixelBytes
  const buf = new Uint8Array(fileSize)
  const dv = new DataView(buf.buffer)
  // BITMAPFILEHEADER
  buf[0] = 0x42
  buf[1] = 0x4D // "BM"
  dv.setUint32(2, fileSize, true)
  dv.setUint32(10, 54, true) // pixel data offset
  // BITMAPINFOHEADER
  dv.setUint32(14, 40, true)
  dv.setInt32(18, w, true)
  dv.setInt32(22, h, true) // positive height = bottom-up
  dv.setUint16(26, 1, true)
  dv.setUint16(28, 24, true)
  dv.setUint32(34, pixelBytes, true)
  for (let y = 0; y < h; y++) {
    const dstRow = 54 + (h - 1 - y) * rowStride
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 4
      const dst = dstRow + x * 3
      buf[dst] = rgba[src + 2] // B
      buf[dst + 1] = rgba[src + 1] // G
      buf[dst + 2] = rgba[src] // R
    }
  }
  // base64 without Buffer dependency
  let out = ''
  for (let i = 0; i < buf.length; i += 3) {
    const b0 = buf[i]
    const b1 = i + 1 < buf.length ? buf[i + 1] : 0
    const b2 = i + 2 < buf.length ? buf[i + 2] : 0
    out += B64[b0 >> 2]
    out += B64[((b0 & 3) << 4) | (b1 >> 4)]
    out += i + 1 < buf.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '='
    out += i + 2 < buf.length ? B64[b2 & 63] : '='
  }
  return out
}

function clampi(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}
