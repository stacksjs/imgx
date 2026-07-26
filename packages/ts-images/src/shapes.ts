import type { ImageData } from './core/image-data'
import type { RGBA } from './text'

/**
 * Anti-aliased primitives: circles, rounded-rectangle outlines, lines.
 *
 * Enough to draw a logo mark onto a generated image without a browser or a
 * canvas implementation in the way. Each shape is defined by its signed
 * distance from the boundary and a pixel's coverage is read off that
 * distance, which gives smooth edges at any size and, for strokes, correct
 * joins and round caps for free.
 */

/** Composite one pixel's worth of `color` at `amount` coverage. */
function blendPixel(target: ImageData, x: number, y: number, color: RGBA, amount: number): void {
  if (amount <= 0.002 || x < 0 || y < 0 || x >= target.width || y >= target.height)
    return

  const alpha = Math.min(1, amount) * (color.a ?? 1)
  if (alpha <= 0)
    return

  const offset = (y * target.width + x) * 4
  const data = target.data

  data[offset] = Math.round(data[offset]! + (color.r - data[offset]!) * alpha)
  data[offset + 1] = Math.round(data[offset + 1]! + (color.g - data[offset + 1]!) * alpha)
  data[offset + 2] = Math.round(data[offset + 2]! + (color.b - data[offset + 2]!) * alpha)
  data[offset + 3] = Math.max(data[offset + 3]!, Math.round(alpha * 255))
}

/**
 * Coverage from a signed distance.
 *
 * Negative is inside. A pixel one unit inside the shape is fully covered, one
 * unit outside is empty, and the half-unit band between them ramps, which is
 * the whole of the anti-aliasing.
 */
function coverageFor(distance: number): number {
  return Math.max(0, Math.min(1, 0.5 - distance))
}

export interface Circle {
  cx: number
  cy: number
  radius: number
}

/** Fill a circle. */
export function fillCircle(target: ImageData, circle: Circle, color: RGBA): void {
  const { cx, cy, radius } = circle
  const left = Math.max(0, Math.floor(cx - radius - 1))
  const right = Math.min(target.width - 1, Math.ceil(cx + radius + 1))
  const top = Math.max(0, Math.floor(cy - radius - 1))
  const bottom = Math.min(target.height - 1, Math.ceil(cy + radius + 1))

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      blendPixel(target, x, y, color, coverageFor(Math.sqrt(dx * dx + dy * dy) - radius))
    }
  }
}

export interface RoundedRect {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

/** Signed distance from a point to a rounded rectangle's boundary. */
function roundedRectDistance(px: number, py: number, rect: RoundedRect): number {
  const halfWidth = rect.width / 2
  const halfHeight = rect.height / 2
  const radius = Math.max(0, Math.min(rect.radius, halfWidth, halfHeight))

  // Fold into one quadrant, then measure against the corner circle's centre.
  const dx = Math.abs(px - (rect.x + halfWidth)) - (halfWidth - radius)
  const dy = Math.abs(py - (rect.y + halfHeight)) - (halfHeight - radius)
  const outside = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2)

  return outside + Math.min(Math.max(dx, dy), 0) - radius
}

/**
 * Stroke a rounded rectangle, centred on its boundary.
 *
 * This is the outline the equivalent SVG `<rect stroke>` draws: the stroke
 * straddles the path, half inside and half out, so a 21x21 rect at 1.6 wide
 * occupies 20.2 to 21.8 units.
 */
export function strokeRoundedRect(target: ImageData, rect: RoundedRect, width: number, color: RGBA): void {
  const half = width / 2
  const left = Math.max(0, Math.floor(rect.x - half - 1))
  const right = Math.min(target.width - 1, Math.ceil(rect.x + rect.width + half + 1))
  const top = Math.max(0, Math.floor(rect.y - half - 1))
  const bottom = Math.min(target.height - 1, Math.ceil(rect.y + rect.height + half + 1))

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const distance = Math.abs(roundedRectDistance(x + 0.5, y + 0.5, rect)) - half
      blendPixel(target, x, y, color, coverageFor(distance))
    }
  }
}

export interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
}

/**
 * Draw a line with round caps.
 *
 * Round rather than butt caps because the distance-to-segment measure
 * produces them naturally, and because a hairline rule inside a logo reads
 * better ending in a curve than in a cut corner.
 */
export function drawLine(target: ImageData, line: Line, color: RGBA): void {
  const { x1, y1, x2, y2 } = line
  const half = line.width / 2
  const left = Math.max(0, Math.floor(Math.min(x1, x2) - half - 1))
  const right = Math.min(target.width - 1, Math.ceil(Math.max(x1, x2) + half + 1))
  const top = Math.max(0, Math.floor(Math.min(y1, y2) - half - 1))
  const bottom = Math.min(target.height - 1, Math.ceil(Math.max(y1, y2) + half + 1))

  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const px = x + 0.5 - x1
      const py = y + 0.5 - y1

      // Where along the segment the closest point lies, clamped to its ends.
      const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared))
      const ox = px - t * dx
      const oy = py - t * dy

      blendPixel(target, x, y, color, coverageFor(Math.sqrt(ox * ox + oy * oy) - half))
    }
  }
}
