import type { ImageData } from './core/image-data'
import type { GradientStop } from './paint'
import type { RGBA } from './text'
import { readFile } from 'node:fs/promises'
import { decode } from './codecs'
import { createImageData } from './core/image-data'
import { drawImage, fillLinearGradient, fillRadialGradient } from './paint'

/**
 * The backdrop a composed image is built on.
 *
 * Share cards and store screenshots want the same thing — a brand-coloured
 * field that is not one flat rectangle — at wildly different sizes, so every
 * position here is a fraction of the canvas rather than a pixel count. One
 * definition then renders correctly at 1200x630, 1290x2796 and 2880x1800,
 * which is the only way a palette stays in step across a listing and a site.
 */
export interface SurfaceBackground {
  /** Flat base colour, painted first. Defaults to near-black. */
  color?: RGBA
  /** Linear wash over the base. `angle` is read as CSS reads it. */
  gradient?: { stops: GradientStop[], angle?: number }
  /**
   * Soft coloured discs over the wash. `x` and `radius` are fractions of the
   * canvas width, `y` a fraction of its height.
   */
  glows?: Array<{ x: number, y: number, radius: number, color: RGBA }>
  /** Photograph, cover-cropped to the canvas and drawn over everything else. */
  image?: string
}

/** Paint a background into an existing canvas. */
export async function paintSurfaceBackground(canvas: ImageData, background: SurfaceBackground): Promise<void> {
  const { width, height } = canvas

  if (background.gradient) {
    fillLinearGradient(
      canvas,
      { x: 0, y: 0, width, height },
      background.gradient.stops,
      { angle: background.gradient.angle },
    )
  }

  for (const glow of background.glows ?? []) {
    fillRadialGradient(
      canvas,
      { cx: glow.x * width, cy: glow.y * height, radius: glow.radius * width },
      [{ offset: 0, color: glow.color }, { offset: 1, color: { ...glow.color, a: 0 } }],
    )
  }

  if (background.image) {
    const photograph = await decode(new Uint8Array(await readFile(background.image)))
    drawImage(canvas, photograph, { x: 0, y: 0, width, height, fit: 'cover' })
  }
}

/** Create a canvas and paint a background onto it. */
export async function createSurface(
  width: number,
  height: number,
  background: SurfaceBackground = {},
): Promise<ImageData> {
  const base = background.color ?? { r: 12, g: 15, b: 11 }
  const canvas = createImageData(width, height, {
    fill: { r: base.r, g: base.g, b: base.b, a: 255 },
  })
  await paintSurfaceBackground(canvas, background)
  return canvas
}
