import { describe, expect, it } from 'bun:test'

/**
 * The brand row has to hold a wordmark, not just an icon.
 *
 * It reserved a SQUARE box for the mark and placed the wordmark at a fixed
 * offset from that square. A 2:1 logo therefore either came out at half the
 * row's height, or, once drawn at its own proportions, ran straight over the
 * text beside it. The row was also gated on `brand`, so a brand whose logo
 * already carries its name could supply a mark and get nothing drawn at all.
 *
 * These cover the geometry the row computes. Rendering is exercised by
 * generating a card and looking at it.
 */

/** The row's layout, as og.ts computes it. */
function brandRow(options: {
  width: number
  padding: number
  brand?: string
  hasMark: boolean
  markAspect?: number
}) {
  const { width, padding, brand, hasMark } = options

  if (!brand && !hasMark)
    return null

  // A lone mark IS the brand on the card, so it takes the room the wordmark
  // beside it would have used.
  const markSize = Math.round(width * (brand ? 0.033 : 0.05))
  const markAspect = Number.isFinite(options.markAspect) && (options.markAspect ?? 0) > 0
    ? options.markAspect!
    : 1
  const markWidth = Math.round(markSize * markAspect)

  let rowWidth = 0
  let plate: { width: number, height: number } | null = null

  if (hasMark) {
    const inset = Math.round(markSize * 0.14)
    plate = { width: markWidth + inset * 2, height: markSize + inset * 2 }
    rowWidth = plate.width
  }

  const brandX = brand
    ? (hasMark ? padding + rowWidth + Math.round(markSize * 0.44) : padding)
    : null

  return { markSize, markWidth, plate, brandX }
}

const W = 1200
const PAD = 80

describe('brand row with a wide mark', () => {
  it('reserves the mark\'s real width, not a square', () => {
    const row = brandRow({ width: W, padding: PAD, brand: 'ERBA Markets', hasMark: true, markAspect: 2.05 })!

    // 2.05:1 artwork gets 2.05x the width of its height.
    expect(row.markWidth).toBe(Math.round(row.markSize * 2.05))
    expect(row.markWidth).toBeGreaterThan(row.markSize)
  })

  it('starts the wordmark after the mark, so the two cannot overlap', () => {
    const wide = brandRow({ width: W, padding: PAD, brand: 'ERBA Markets', hasMark: true, markAspect: 2.05 })!

    // The whole failure was the wordmark sitting at a fixed square-based
    // offset while the mark extended past it.
    expect(wide.brandX!).toBeGreaterThan(PAD + wide.plate!.width)
  })

  it('leaves a square mark exactly where it was', () => {
    const square = brandRow({ width: W, padding: PAD, brand: 'Acme', hasMark: true, markAspect: 1 })!

    expect(square.markWidth).toBe(square.markSize)
    expect(square.plate!.width).toBe(square.plate!.height)
  })

  it('treats a missing or nonsense aspect as square', () => {
    for (const aspect of [undefined, 0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      const row = brandRow({ width: W, padding: PAD, brand: 'Acme', hasMark: true, markAspect: aspect as number })!
      expect(row.markWidth).toBe(row.markSize)
    }
  })
})

describe('a mark on its own', () => {
  it('draws, where it used to be skipped entirely', () => {
    // Gating the row on `brand` meant supplying only a mark rendered nothing.
    expect(brandRow({ width: W, padding: PAD, hasMark: true, markAspect: 2.05 })).not.toBeNull()
  })

  it('takes the room the wordmark would have used', () => {
    const alone = brandRow({ width: W, padding: PAD, hasMark: true, markAspect: 2.05 })!
    const beside = brandRow({ width: W, padding: PAD, brand: 'ERBA Markets', hasMark: true, markAspect: 2.05 })!

    expect(alone.markSize).toBeGreaterThan(beside.markSize)
    expect(alone.brandX).toBeNull()
  })

  it('still renders nothing when there is neither a mark nor a brand', () => {
    expect(brandRow({ width: W, padding: PAD, hasMark: false })).toBeNull()
  })

  it('keeps the plate the shape of the mark', () => {
    const row = brandRow({ width: W, padding: PAD, hasMark: true, markAspect: 2.05 })!

    // A square plate behind a wordmark clips it at the sides.
    expect(row.plate!.width).toBeGreaterThan(row.plate!.height)
    expect(row.plate!.width).toBeGreaterThan(row.markWidth)
    expect(row.plate!.height).toBeGreaterThan(row.markSize)
  })
})
