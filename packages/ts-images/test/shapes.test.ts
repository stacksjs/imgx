import { describe, expect, it } from 'bun:test'
import { createImageData } from '../src/core/image-data'
import { drawLine, fillCircle, strokeRoundedRect } from '../src/shapes'

const BLACK = { r: 0, g: 0, b: 0 }

/** Read one pixel's red channel, which for a black-on-white draw is its coverage. */
function ink(image: ReturnType<typeof createImageData>, x: number, y: number): number {
  return 255 - image.data[(y * image.width + x) * 4]!
}

function white(width: number, height: number): ReturnType<typeof createImageData> {
  const image = createImageData(width, height)
  image.data.fill(255)
  return image
}

describe('fillCircle', () => {
  it('fills the centre and leaves the corners alone', () => {
    const image = white(40, 40)
    fillCircle(image, { cx: 20, cy: 20, radius: 10 }, BLACK)

    expect(ink(image, 20, 20)).toBe(255)
    expect(ink(image, 20, 12)).toBe(255)
    expect(ink(image, 1, 1)).toBe(0)
    expect(ink(image, 38, 38)).toBe(0)
  })

  it('anti-aliases its edge', () => {
    const image = white(40, 40)
    // A fractional radius so the boundary lands inside a pixel rather than
    // on the seam between two.
    fillCircle(image, { cx: 20, cy: 20, radius: 10.25 }, BLACK)

    // The pixel straddling the boundary is neither fully inked nor untouched.
    const edge = ink(image, 30, 20)
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(255)
  })

  it('clips to the image rather than throwing', () => {
    const image = white(20, 20)
    expect(() => fillCircle(image, { cx: 0, cy: 0, radius: 12 }, BLACK)).not.toThrow()
    expect(ink(image, 0, 0)).toBe(255)
  })
})

describe('strokeRoundedRect', () => {
  it('draws the boundary and leaves the interior empty', () => {
    const image = white(60, 60)
    strokeRoundedRect(image, { x: 10, y: 10, width: 40, height: 40, radius: 8 }, 2, BLACK)

    // On the top edge, inked; well inside and well outside, not.
    expect(ink(image, 30, 10)).toBeGreaterThan(200)
    expect(ink(image, 30, 30)).toBe(0)
    expect(ink(image, 30, 4)).toBe(0)
  })

  it('rounds its corners', () => {
    const image = white(60, 60)
    strokeRoundedRect(image, { x: 10, y: 10, width: 40, height: 40, radius: 10 }, 2, BLACK)

    // The square corner is outside a rounded rect, so it stays clean.
    expect(ink(image, 10, 10)).toBe(0)
  })
})

describe('drawLine', () => {
  it('inks the path between its ends', () => {
    const image = white(40, 40)
    drawLine(image, { x1: 5, y1: 5, x2: 34, y2: 34, width: 2 }, BLACK)

    expect(ink(image, 20, 20)).toBeGreaterThan(200)
    expect(ink(image, 30, 10)).toBe(0)
  })

  it('stops at its ends, with a round cap', () => {
    const image = white(40, 40)
    drawLine(image, { x1: 10, y1: 20, x2: 30, y2: 20, width: 4 }, BLACK)

    expect(ink(image, 10, 20)).toBeGreaterThan(200)
    // Beyond the cap by more than the half-width: untouched.
    expect(ink(image, 34, 20)).toBe(0)
  })

  it('handles a zero-length segment as a dot', () => {
    const image = white(20, 20)
    expect(() => drawLine(image, { x1: 10, y1: 10, x2: 10, y2: 10, width: 4 }, BLACK)).not.toThrow()
    expect(ink(image, 10, 10)).toBeGreaterThan(200)
  })
})
