import type { ImageData } from './core/image-data'
import type { Font } from './font'
import { flattenContours, loadFont } from './font'

/**
 * Drawing text onto an image.
 *
 * Glyph outlines come from {@link loadFont}; this module lays them out on a
 * baseline and fills them.
 *
 * The fill is a scanline pass with non-zero winding, sampled several times per
 * pixel row and accumulating fractional horizontal coverage. That gives real
 * anti-aliasing on both axes without a second buffer to downsample, which
 * matters because a 1200x630 card at heading sizes is a lot of pixels to
 * supersample naively.
 */

export interface RGBA {
  r: number
  g: number
  b: number
  /** 0-1. Defaults to 1. */
  a?: number
}

export interface TextOptions {
  text: string
  font: Font
  /** Cap-to-baseline size in pixels, as a CSS `font-size` would be. */
  size: number
  /** Left edge of the text box. */
  x: number
  /** Baseline of the FIRST line. */
  y: number
  color: RGBA
  /** Wrap at this width, in pixels. Omit to draw one unbroken line. */
  maxWidth?: number
  /** Multiple of `size`. Defaults to 1.2. */
  lineHeight?: number
  /** Extra space between glyphs, as a multiple of `size`. Negative tightens. */
  letterSpacing?: number
  /** Stop after this many lines. The last one is not ellipsised. */
  maxLines?: number
}

export interface TextMetrics {
  width: number
  height: number
  lines: string[]
  lineHeight: number
}

/** Split `text` into lines that fit `maxWidth`, breaking on spaces. */
export function layoutText(options: Omit<TextOptions, 'x' | 'y' | 'color'>): TextMetrics {
  const { text, font, size, maxWidth, maxLines } = options
  const lineHeight = (options.lineHeight ?? 1.2) * size
  const letterSpacing = (options.letterSpacing ?? 0) * size

  const measure = (value: string): number => measureLine(value, font, size, letterSpacing)

  if (!maxWidth) {
    const lines = text.split('\n')
    return {
      width: Math.max(...lines.map(measure), 0),
      height: lines.length * lineHeight,
      lines,
      lineHeight,
    }
  }

  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let current = ''

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word

      if (measure(candidate) <= maxWidth || !current) {
        current = candidate
        continue
      }

      lines.push(current)
      current = word

      if (maxLines && lines.length >= maxLines)
        break
    }

    if (current && (!maxLines || lines.length < maxLines))
      lines.push(current)

    if (maxLines && lines.length >= maxLines)
      break
  }

  const kept = maxLines ? lines.slice(0, maxLines) : lines

  return {
    width: Math.max(...kept.map(measure), 0),
    height: kept.length * lineHeight,
    lines: kept,
    lineHeight,
  }
}

function measureLine(text: string, font: Font, size: number, letterSpacing: number): number {
  const scale = size / font.unitsPerEm
  let width = 0

  for (const character of text) {
    const glyphId = font.glyphIdFor(character.codePointAt(0) ?? 0)
    width += font.advanceWidth(glyphId) * scale + letterSpacing
  }

  return width - (text.length > 0 ? letterSpacing : 0)
}

/**
 * Draw text onto `target`, in place.
 *
 * Returns the metrics of what was drawn, so a caller stacking blocks knows
 * where the next one starts.
 */
export function drawText(target: ImageData, options: TextOptions): TextMetrics {
  const { font, size, x, y, color } = options
  const metrics = layoutText(options)
  const scale = size / font.unitsPerEm
  const letterSpacing = (options.letterSpacing ?? 0) * size

  metrics.lines.forEach((line, index) => {
    const baseline = y + index * metrics.lineHeight
    let penX = x

    for (const character of line) {
      const glyphId = font.glyphIdFor(character.codePointAt(0) ?? 0)
      const polygons = flattenContours(font.outline(glyphId))

      if (polygons.length > 0) {
        // Font units are y-up from the baseline; the image is y-down from the
        // top, so y is negated around the baseline.
        const edges = polygons.map(polygon => polygon.map(point => ({
          x: penX + point.x * scale,
          y: baseline - point.y * scale,
        })))

        fillPolygons(target, edges, color)
      }

      penX += font.advanceWidth(glyphId) * scale + letterSpacing
    }
  })

  return metrics
}

/** Vertical samples per pixel row. Four is the usual quality/cost trade. */
const SUBSAMPLES = 4

/**
 * Fill closed polygons with the non-zero winding rule.
 *
 * Each pixel row is sampled `SUBSAMPLES` times. On every sub-row the edge
 * crossings are collected with their winding direction, sorted, and walked to
 * find the spans that are inside; each span contributes `1 / SUBSAMPLES`
 * coverage, with the partially covered pixels at either end getting their
 * fractional share. Coverage is accumulated per row and then blended once, so
 * overlapping contours in the same glyph cannot double-darken a pixel.
 */
function fillPolygons(target: ImageData, polygons: { x: number, y: number }[][], color: RGBA): void {
  const edges: { x0: number, y0: number, x1: number, y1: number }[] = []
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY

  for (const polygon of polygons) {
    for (let i = 0; i < polygon.length; i++) {
      const from = polygon[i]!
      const to = polygon[(i + 1) % polygon.length]!

      // Horizontal edges never produce a crossing; skipping them keeps the
      // crossing list free of degenerate pairs.
      if (from.y === to.y)
        continue

      edges.push({ x0: from.x, y0: from.y, x1: to.x, y1: to.y })
      minY = Math.min(minY, from.y, to.y)
      maxY = Math.max(maxY, from.y, to.y)
      minX = Math.min(minX, from.x, to.x)
      maxX = Math.max(maxX, from.x, to.x)
    }
  }

  if (edges.length === 0)
    return

  const rowStart = Math.max(0, Math.floor(minY))
  const rowEnd = Math.min(target.height - 1, Math.ceil(maxY))
  const colStart = Math.max(0, Math.floor(minX))
  const colEnd = Math.min(target.width - 1, Math.ceil(maxX))

  if (rowEnd < rowStart || colEnd < colStart)
    return

  const rowWidth = colEnd - colStart + 1
  const coverage = new Float32Array(rowWidth)
  const crossings: { x: number, winding: number }[] = []

  for (let row = rowStart; row <= rowEnd; row++) {
    coverage.fill(0)

    for (let sub = 0; sub < SUBSAMPLES; sub++) {
      const sampleY = row + (sub + 0.5) / SUBSAMPLES
      crossings.length = 0

      for (const edge of edges) {
        const { x0, y0, x1, y1 } = edge
        const top = Math.min(y0, y1)
        const bottom = Math.max(y0, y1)

        // Half-open in y so a vertex shared by two edges is counted once.
        if (sampleY < top || sampleY >= bottom)
          continue

        const t = (sampleY - y0) / (y1 - y0)
        crossings.push({ x: x0 + t * (x1 - x0), winding: y1 > y0 ? 1 : -1 })
      }

      if (crossings.length < 2)
        continue

      crossings.sort((a, b) => a.x - b.x)

      let winding = 0
      for (let i = 0; i < crossings.length - 1; i++) {
        winding += crossings[i]!.winding
        if (winding === 0)
          continue

        addSpan(coverage, colStart, colEnd, crossings[i]!.x, crossings[i + 1]!.x, 1 / SUBSAMPLES)
      }
    }

    blendRow(target, row, colStart, coverage, color)
  }
}

/** Add `weight` coverage across [spanStart, spanEnd), with fractional ends. */
function addSpan(
  coverage: Float32Array,
  colStart: number,
  colEnd: number,
  spanStart: number,
  spanEnd: number,
  weight: number,
): void {
  const from = Math.max(spanStart, colStart)
  const to = Math.min(spanEnd, colEnd + 1)
  if (to <= from)
    return

  const firstPixel = Math.floor(from)
  const lastPixel = Math.ceil(to) - 1

  for (let pixel = firstPixel; pixel <= lastPixel; pixel++) {
    const covered = Math.min(pixel + 1, to) - Math.max(pixel, from)
    if (covered <= 0)
      continue

    const index = pixel - colStart
    if (index >= 0 && index < coverage.length)
      coverage[index]! += covered * weight
  }
}

/** Source-over blend of one row of coverage into the target. */
function blendRow(target: ImageData, row: number, colStart: number, coverage: Float32Array, color: RGBA): void {
  const alpha = color.a ?? 1

  for (let i = 0; i < coverage.length; i++) {
    const amount = Math.min(1, coverage[i]!) * alpha
    if (amount <= 0.0015)
      continue

    const offset = (row * target.width + colStart + i) * 4
    const data = target.data

    data[offset] = Math.round(data[offset]! + (color.r - data[offset]!) * amount)
    data[offset + 1] = Math.round(data[offset + 1]! + (color.g - data[offset + 1]!) * amount)
    data[offset + 2] = Math.round(data[offset + 2]! + (color.b - data[offset + 2]!) * amount)
    data[offset + 3] = Math.max(data[offset + 3]!, Math.round(amount * 255))
  }
}

/** Fill an axis-aligned rectangle. Used for scrims and rules. */
export function fillRect(
  target: ImageData,
  rect: { x: number, y: number, width: number, height: number },
  color: RGBA,
): void {
  const alpha = color.a ?? 1
  if (alpha <= 0)
    return

  const left = Math.max(0, Math.round(rect.x))
  const top = Math.max(0, Math.round(rect.y))
  const right = Math.min(target.width, Math.round(rect.x + rect.width))
  const bottom = Math.min(target.height, Math.round(rect.y + rect.height))

  for (let row = top; row < bottom; row++) {
    for (let column = left; column < right; column++) {
      const offset = (row * target.width + column) * 4
      const data = target.data

      data[offset] = Math.round(data[offset]! + (color.r - data[offset]!) * alpha)
      data[offset + 1] = Math.round(data[offset + 1]! + (color.g - data[offset + 1]!) * alpha)
      data[offset + 2] = Math.round(data[offset + 2]! + (color.b - data[offset + 2]!) * alpha)
      data[offset + 3] = Math.max(data[offset + 3]!, Math.round(alpha * 255))
    }
  }
}

/**
 * Fill a rectangle with rounded corners.
 *
 * The corners are anti-aliased by measuring, per row, how far the rounded
 * edge cuts in and giving the boundary pixel its fractional share — the same
 * coverage idea the glyph fill uses, in the one case simple enough to solve
 * directly.
 */
export function fillRoundedRect(
  target: ImageData,
  rect: { x: number, y: number, width: number, height: number, radius: number },
  color: RGBA,
): void {
  const alpha = color.a ?? 1
  if (alpha <= 0)
    return

  const radius = Math.max(0, Math.min(rect.radius, rect.width / 2, rect.height / 2))
  const left = rect.x
  const top = rect.y
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  const rowStart = Math.max(0, Math.floor(top))
  const rowEnd = Math.min(target.height - 1, Math.ceil(bottom) - 1)

  for (let row = rowStart; row <= rowEnd; row++) {
    const centreY = row + 0.5

    // How far this row is into a corner, if at all.
    let inset = 0
    if (centreY < top + radius) {
      const dy = top + radius - centreY
      inset = radius - Math.sqrt(Math.max(0, radius * radius - dy * dy))
    }
    else if (centreY > bottom - radius) {
      const dy = centreY - (bottom - radius)
      inset = radius - Math.sqrt(Math.max(0, radius * radius - dy * dy))
    }

    const rowLeft = left + inset
    const rowRight = right - inset
    const colStart = Math.max(0, Math.floor(rowLeft))
    const colEnd = Math.min(target.width - 1, Math.ceil(rowRight) - 1)

    for (let column = colStart; column <= colEnd; column++) {
      // Fractional coverage where the edge crosses this pixel.
      const covered = Math.min(column + 1, rowRight) - Math.max(column, rowLeft)
      const amount = Math.max(0, Math.min(1, covered)) * alpha
      if (amount <= 0.002)
        continue

      const offset = (row * target.width + column) * 4
      const data = target.data

      data[offset] = Math.round(data[offset]! + (color.r - data[offset]!) * amount)
      data[offset + 1] = Math.round(data[offset + 1]! + (color.g - data[offset + 1]!) * amount)
      data[offset + 2] = Math.round(data[offset + 2]! + (color.b - data[offset + 2]!) * amount)
      data[offset + 3] = Math.max(data[offset + 3]!, Math.round(amount * 255))
    }
  }
}

/**
 * A vertical gradient of one colour's opacity, darkest at the bottom.
 *
 * The usual scrim under text sitting on a photograph: enough contrast to read
 * against, without flattening the image into a colour block.
 */
export function fillVerticalScrim(
  target: ImageData,
  rect: { x: number, y: number, width: number, height: number },
  color: RGBA,
  from = 0,
  to = 1,
): void {
  const left = Math.max(0, Math.round(rect.x))
  const top = Math.max(0, Math.round(rect.y))
  const right = Math.min(target.width, Math.round(rect.x + rect.width))
  const bottom = Math.min(target.height, Math.round(rect.y + rect.height))
  const span = Math.max(1, bottom - top - 1)

  for (let row = top; row < bottom; row++) {
    // Eased so the top of the scrim disappears into the image rather than
    // ending on a visible line.
    const t = (row - top) / span
    const alpha = from + (to - from) * (t * t)

    for (let column = left; column < right; column++) {
      const offset = (row * target.width + column) * 4
      const data = target.data

      data[offset] = Math.round(data[offset]! + (color.r - data[offset]!) * alpha)
      data[offset + 1] = Math.round(data[offset + 1]! + (color.g - data[offset + 1]!) * alpha)
      data[offset + 2] = Math.round(data[offset + 2]! + (color.b - data[offset + 2]!) * alpha)
      data[offset + 3] = 255
    }
  }
}

export { loadFont }
export type { Font }
