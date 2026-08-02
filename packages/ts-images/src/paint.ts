import type { ImageData } from './core/image-data'
import type { ResizeFit } from './core/resize'
import type { RGBA } from './text'
import { resize } from './core'

/**
 * The painting layer: gradients, image placement, and shadows.
 *
 * `text.ts` draws words and flat rectangles and `shapes.ts` draws outlines;
 * what neither does is the work a marketing composition actually needs — a
 * background that is not one flat colour, a screenshot dropped in with
 * rounded corners, and something soft underneath it so the screenshot reads
 * as a physical object rather than a sticker.
 *
 * These exist so a share card or a store screenshot can be composed without
 * a browser in the pipeline. The alternative — render HTML in a headless
 * Chrome and screenshot it — needs a display server in CI, produces sizes
 * that depend on device pixel ratio, and cannot hit Apple's exact pixel
 * dimensions without a second resampling pass through an external tool.
 */

/** A colour stop. `offset` runs 0 to 1 along the gradient's axis. */
export interface GradientStop {
  offset: number
  color: RGBA
}

interface Region {
  x: number
  y: number
  width: number
  height: number
}

/** Blend `color` at `amount` (0-1) coverage into one pixel. */
function blend(data: ImageData['data'], offset: number, color: RGBA, amount: number): void {
  const alpha = amount * (color.a ?? 1)
  if (alpha <= 0.002)
    return

  data[offset] = Math.round(data[offset]! + (color.r - data[offset]!) * alpha)
  data[offset + 1] = Math.round(data[offset + 1]! + (color.g - data[offset + 1]!) * alpha)
  data[offset + 2] = Math.round(data[offset + 2]! + (color.b - data[offset + 2]!) * alpha)
  data[offset + 3] = Math.max(data[offset + 3]!, Math.round(alpha * 255))
}

/** Clip a region to the canvas, as integer pixel bounds. */
function clip(target: ImageData, region: Region): { left: number, top: number, right: number, bottom: number } {
  return {
    left: Math.max(0, Math.floor(region.x)),
    top: Math.max(0, Math.floor(region.y)),
    right: Math.min(target.width, Math.ceil(region.x + region.width)),
    bottom: Math.min(target.height, Math.ceil(region.y + region.height)),
  }
}

/**
 * Sort stops once and read a colour off them.
 *
 * Interpolation is in straight sRGB rather than a perceptual space: these
 * gradients sit behind text as backgrounds, where matching what the same
 * stops produce in CSS matters more than being perceptually even.
 */
function sampler(stops: GradientStop[]): (t: number) => RGBA {
  if (!stops.length)
    throw new TypeError('A gradient needs at least one colour stop')

  const sorted = [...stops].sort((a, b) => a.offset - b.offset)

  return (t: number): RGBA => {
    if (t <= sorted[0]!.offset)
      return sorted[0]!.color
    if (t >= sorted[sorted.length - 1]!.offset)
      return sorted[sorted.length - 1]!.color

    for (let i = 1; i < sorted.length; i++) {
      const end = sorted[i]!
      if (t > end.offset)
        continue

      const start = sorted[i - 1]!
      const span = end.offset - start.offset
      const local = span <= 0 ? 0 : (t - start.offset) / span

      return {
        r: start.color.r + (end.color.r - start.color.r) * local,
        g: start.color.g + (end.color.g - start.color.g) * local,
        b: start.color.b + (end.color.b - start.color.b) * local,
        a: (start.color.a ?? 1) + ((end.color.a ?? 1) - (start.color.a ?? 1)) * local,
      }
    }

    return sorted[sorted.length - 1]!.color
  }
}

export interface LinearGradientOptions {
  /**
   * Direction, in degrees, measured the way CSS `linear-gradient` measures
   * it: 0 points up, 90 points right, 180 points down. Defaults to 180, a
   * plain top-to-bottom wash.
   */
  angle?: number
}

/**
 * Paint a multi-stop linear gradient over a region, compositing rather than
 * replacing — a stop list carrying alpha lays a tint over what is already
 * there, which is how the accent washes on a store screenshot are built.
 *
 * `createLinearGradient` in `core/composite` produces a standalone two-colour
 * image to be composited separately. This draws in place, takes any number of
 * stops, and takes an arbitrary angle, which is what a layout needs.
 */
export function fillLinearGradient(
  target: ImageData,
  region: Region,
  stops: GradientStop[],
  options: LinearGradientOptions = {},
): void {
  const bounds = clip(target, region)
  if (bounds.right <= bounds.left || bounds.bottom <= bounds.top)
    return

  const sample = sampler(stops)
  const radians = ((options.angle ?? 180) - 90) * (Math.PI / 180)
  const dirX = Math.cos(radians)
  const dirY = Math.sin(radians)

  // Project the region's corners onto the gradient axis so that offset 0 sits
  // on the first corner the axis reaches and offset 1 on the last, which is
  // what makes a 45-degree gradient span the whole box rather than clipping.
  const corners = [
    [region.x, region.y],
    [region.x + region.width, region.y],
    [region.x, region.y + region.height],
    [region.x + region.width, region.y + region.height],
  ] as const
  const projections = corners.map(([x, y]) => x * dirX + y * dirY)
  const start = Math.min(...projections)
  const span = Math.max(...projections) - start || 1

  for (let row = bounds.top; row < bounds.bottom; row++) {
    for (let column = bounds.left; column < bounds.right; column++) {
      const t = ((column + 0.5) * dirX + (row + 0.5) * dirY - start) / span
      const color = sample(Math.max(0, Math.min(1, t)))
      blend(target.data, (row * target.width + column) * 4, color, 1)
    }
  }
}

export interface RadialGradientOptions {
  cx: number
  cy: number
  radius: number
  /** Squash the circle horizontally or vertically. Defaults to 1 (round). */
  aspectRatio?: number
}

/**
 * Paint a radial gradient, compositing in place.
 *
 * The point of this is the coloured glow behind a headline: a stop list that
 * runs from a tinted centre to a fully transparent edge, laid over a flat or
 * linear background. Pixels past the outer radius are left alone entirely,
 * so the cost is the disc rather than the canvas.
 */
export function fillRadialGradient(
  target: ImageData,
  options: RadialGradientOptions,
  stops: GradientStop[],
): void {
  const aspect = options.aspectRatio ?? 1
  const radiusX = options.radius * aspect
  const radiusY = options.radius
  const bounds = clip(target, {
    x: options.cx - radiusX,
    y: options.cy - radiusY,
    width: radiusX * 2,
    height: radiusY * 2,
  })
  if (bounds.right <= bounds.left || bounds.bottom <= bounds.top)
    return

  const sample = sampler(stops)

  for (let row = bounds.top; row < bounds.bottom; row++) {
    const dy = (row + 0.5 - options.cy) / radiusY
    for (let column = bounds.left; column < bounds.right; column++) {
      const dx = (column + 0.5 - options.cx) / radiusX
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance >= 1)
        continue

      blend(target.data, (row * target.width + column) * 4, sample(distance), 1)
    }
  }
}

/**
 * How much of a pixel a rounded rectangle covers, from the signed distance to
 * its boundary. Shared by the image mask and the shadow silhouette.
 */
function roundedCoverage(px: number, py: number, rect: Region & { radius: number }): number {
  const halfWidth = rect.width / 2
  const halfHeight = rect.height / 2
  const radius = Math.max(0, Math.min(rect.radius, halfWidth, halfHeight))

  const dx = Math.abs(px - (rect.x + halfWidth)) - (halfWidth - radius)
  const dy = Math.abs(py - (rect.y + halfHeight)) - (halfHeight - radius)
  const outside = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2)
  const distance = outside + Math.min(Math.max(dx, dy), 0) - radius

  return Math.max(0, Math.min(1, 0.5 - distance))
}

export interface DrawImageOptions {
  x: number
  y: number
  /** Target box. Defaults to the source's own dimensions. */
  width?: number
  height?: number
  /** How the source fills the box when the aspect ratios differ. */
  fit?: ResizeFit
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Corner radius, in target pixels. */
  radius?: number
  /** Multiplies the source's own alpha. Defaults to 1. */
  opacity?: number
}

/**
 * Draw one image into another, resampled to a box and masked to rounded
 * corners.
 *
 * `composite` in `core/composite` overlays a whole layer at a offset and
 * returns a new image. This places a resized source at a position, respects
 * both the source's alpha and the corner mask, and writes in place, which is
 * what building a layout out of several pieces wants.
 *
 * Returns the box actually drawn, so a caller can put a shadow or a caption
 * against it without recomputing the fit.
 */
export function drawImage(target: ImageData, source: ImageData, options: DrawImageOptions): Region {
  const width = Math.round(options.width ?? source.width)
  const height = Math.round(options.height ?? source.height)
  const x = Math.round(options.x)
  const y = Math.round(options.y)
  const opacity = options.opacity ?? 1
  const radius = options.radius ?? 0

  const scaled = width === source.width && height === source.height
    ? source
    : resize(source, { width, height, fit: options.fit ?? 'cover', position: options.position ?? 'center' })

  const box: Region = { x, y, width: scaled.width, height: scaled.height }
  const bounds = clip(target, box)

  for (let row = bounds.top; row < bounds.bottom; row++) {
    const sourceRow = row - y
    for (let column = bounds.left; column < bounds.right; column++) {
      const sourceOffset = (sourceRow * scaled.width + (column - x)) * 4
      const sourceAlpha = (scaled.data[sourceOffset + 3]! / 255) * opacity
      if (sourceAlpha <= 0)
        continue

      const mask = radius > 0 ? roundedCoverage(column + 0.5, row + 0.5, { ...box, radius }) : 1
      if (mask <= 0)
        continue

      blend(
        target.data,
        (row * target.width + column) * 4,
        { r: scaled.data[sourceOffset]!, g: scaled.data[sourceOffset + 1]!, b: scaled.data[sourceOffset + 2]! },
        sourceAlpha * mask,
      )
    }
  }

  return box
}

/**
 * Three box blurs in a row, which is close enough to a Gaussian that the
 * difference is invisible in a shadow and costs a constant number of adds per
 * pixel rather than growing with the radius.
 *
 * Runs on a single-channel coverage buffer; the shadow's colour is applied
 * afterwards, so there is nothing to blur but the silhouette.
 */
function blurMask(mask: Float32Array, width: number, height: number, radius: number): void {
  if (radius < 1)
    return

  const scratch = new Float32Array(mask.length)

  const pass = (from: Float32Array, to: Float32Array, majorCount: number, minorCount: number, majorStride: number, minorStride: number): void => {
    const window = radius * 2 + 1
    for (let major = 0; major < majorCount; major++) {
      const base = major * majorStride
      let sum = 0
      // Edges are clamped rather than treated as zero, so a shadow whose
      // silhouette runs off the buffer does not fade out along that edge.
      for (let i = -radius; i <= radius; i++)
        sum += from[base + Math.max(0, Math.min(minorCount - 1, i)) * minorStride]!

      for (let minor = 0; minor < minorCount; minor++) {
        to[base + minor * minorStride] = sum / window
        const leaving = Math.max(0, Math.min(minorCount - 1, minor - radius))
        const entering = Math.max(0, Math.min(minorCount - 1, minor + radius + 1))
        sum += from[base + entering * minorStride]! - from[base + leaving * minorStride]!
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    pass(mask, scratch, height, width, width, 1)
    pass(scratch, mask, width, height, 1, width)
  }
}

export interface DropShadowOptions {
  /** Blur radius, read the way CSS `box-shadow` reads its third length. */
  blur: number
  offsetX?: number
  offsetY?: number
  /** Grows (or, negative, shrinks) the silhouette before blurring. */
  spread?: number
  /** Defaults to black at 40%. `a` is 0-1. */
  color?: RGBA
}

/**
 * Paint a soft shadow for a rounded rectangle.
 *
 * Call it before drawing whatever casts it: there is no z-order here, only
 * the order the calls happen in.
 *
 * Only the silhouette's neighbourhood is touched, so a shadow under a 780px
 * device on a 2732px-tall canvas costs the device's area rather than the
 * canvas's.
 */
export function dropShadow(target: ImageData, rect: Region & { radius: number }, options: DropShadowOptions): void {
  const color = options.color ?? { r: 0, g: 0, b: 0, a: 0.4 }
  const spread = options.spread ?? 0
  const silhouette: Region & { radius: number } = {
    x: rect.x + (options.offsetX ?? 0) - spread,
    y: rect.y + (options.offsetY ?? 0) - spread,
    width: rect.width + spread * 2,
    height: rect.height + spread * 2,
    radius: Math.max(0, rect.radius + spread),
  }

  // A three-pass box blur of radius r spreads a hard edge over roughly 3r, so
  // the buffer has to carry that much margin or the shadow is cut square.
  const boxRadius = Math.max(0, Math.round(options.blur / 2))
  const margin = boxRadius * 3 + 2
  const left = Math.floor(silhouette.x) - margin
  const top = Math.floor(silhouette.y) - margin
  const width = Math.ceil(silhouette.width) + margin * 2
  const height = Math.ceil(silhouette.height) + margin * 2
  if (width <= 0 || height <= 0)
    return

  const mask = new Float32Array(width * height)
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++)
      mask[row * width + column] = roundedCoverage(left + column + 0.5, top + row + 0.5, silhouette)
  }

  blurMask(mask, width, height, boxRadius)

  const bounds = clip(target, { x: left, y: top, width, height })
  for (let row = bounds.top; row < bounds.bottom; row++) {
    for (let column = bounds.left; column < bounds.right; column++) {
      const amount = mask[(row - top) * width + (column - left)]!
      if (amount <= 0.002)
        continue

      blend(target.data, (row * target.width + column) * 4, color, amount)
    }
  }
}

/**
 * Read a CSS-style colour into an `RGBA`.
 *
 * Configuration files and brand sheets carry hex, and hand-translating
 * `#ef4444` into `{ r: 239, g: 68, b: 68 }` at every call site is how a
 * palette drifts. Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, and the
 * `rgb()`/`rgba()` functional forms; `a` comes back as 0-1 to match `RGBA`.
 */
export function parseColor(value: string): RGBA {
  const input = value.trim()

  const functional = /^rgba?\(([^)]+)\)$/i.exec(input)
  if (functional) {
    const parts = functional[1]!.split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3)
      throw new TypeError(`Unsupported colour: ${value}`)

    const channel = (raw: string): number => {
      const number = Number.parseFloat(raw)
      if (Number.isNaN(number))
        throw new TypeError(`Unsupported colour: ${value}`)
      return raw.endsWith('%') ? (number / 100) * 255 : number
    }
    const alphaPart = parts[3]
    const alpha = alphaPart === undefined
      ? 1
      : alphaPart.endsWith('%')
        ? Number.parseFloat(alphaPart) / 100
        : Number.parseFloat(alphaPart)

    return { r: channel(parts[0]!), g: channel(parts[1]!), b: channel(parts[2]!), a: alpha }
  }

  const hex = input.startsWith('#') ? input.slice(1) : input
  if (!/^[0-9a-f]+$/i.test(hex) || ![3, 4, 6, 8].includes(hex.length))
    throw new TypeError(`Unsupported colour: ${value}`)

  const expanded = hex.length <= 4 ? [...hex].map(character => character + character).join('') : hex
  const channel = (index: number): number => Number.parseInt(expanded.slice(index * 2, index * 2 + 2), 16)

  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: expanded.length === 8 ? channel(3) / 255 : 1,
  }
}
