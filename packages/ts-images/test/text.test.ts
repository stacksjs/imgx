import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createImageData } from '../src/core/image-data'
import { flattenContours, loadFont } from '../src/font'
import { drawText, fillRect, layoutText } from '../src/text'

// A real TrueType face is needed to exercise the parser at all. Skipped
// rather than failed where one is not on the machine, so the suite still
// runs on a bare checkout.
const FONT = '/Users/chris/Code/Fonts/Satoshi/WEB/fonts/Satoshi-Bold.ttf'
const hasFont = existsSync(FONT)

describe.if(hasFont)('font', () => {
  it('reads the metrics tables', async () => {
    const font = loadFont(new Uint8Array(await readFile(FONT)))

    expect(font.unitsPerEm).toBeGreaterThan(0)
    expect(font.glyphCount).toBeGreaterThan(100)
    expect(font.ascender).toBeGreaterThan(0)
  })

  it('maps characters to glyphs, and unknown ones to .notdef', async () => {
    const font = loadFont(new Uint8Array(await readFile(FONT)))

    expect(font.glyphIdFor('A'.codePointAt(0)!)).toBeGreaterThan(0)
    expect(font.glyphIdFor('ö'.codePointAt(0)!)).toBeGreaterThan(0)
    // A code point in a private-use area the font will not cover.
    expect(font.glyphIdFor(0xE000)).toBe(0)
  })

  it('gives a letter with a counter more than one contour', async () => {
    const font = loadFont(new Uint8Array(await readFile(FONT)))

    // 'o' is a ring: an outer contour and an inner one. A parser that lost the
    // inner contour would still draw something, just filled in solid.
    expect(font.outline(font.glyphIdFor('o'.codePointAt(0)!)).length).toBe(2)
    // A space has no outline at all.
    expect(font.outline(font.glyphIdFor(32)).length).toBe(0)
  })

  it('flattens curves into closed polygons', async () => {
    const font = loadFont(new Uint8Array(await readFile(FONT)))
    const polygons = flattenContours(font.outline(font.glyphIdFor('o'.codePointAt(0)!)))

    expect(polygons.length).toBe(2)
    for (const polygon of polygons) expect(polygon.length).toBeGreaterThan(8)
  })

  it('rejects a format it cannot read rather than drawing nothing', () => {
    // 'OTTO': OpenType with CFF outlines.
    const otto = new Uint8Array([0x4F, 0x54, 0x54, 0x4F, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(() => loadFont(otto)).toThrow(/CFF/)
  })
})

describe.if(hasFont)('text', () => {
  it('measures a line and wraps at a width', async () => {
    const font = loadFont(new Uint8Array(await readFile(FONT)))

    const single = layoutText({ text: 'Most of your field is fine.', font, size: 64 })
    expect(single.lines.length).toBe(1)
    expect(single.width).toBeGreaterThan(0)

    const wrapped = layoutText({ text: 'Most of your field is fine.', font, size: 64, maxWidth: 300 })
    expect(wrapped.lines.length).toBeGreaterThan(1)
    expect(wrapped.width).toBeLessThanOrEqual(300)
  })

  it('honours maxLines', async () => {
    const font = loadFont(new Uint8Array(await readFile(FONT)))
    const metrics = layoutText({
      text: 'Scan the block, mark the problem, and treat only the marks that were found',
      font,
      size: 48,
      maxWidth: 240,
      maxLines: 2,
    })

    expect(metrics.lines.length).toBe(2)
  })

  it('actually puts ink on the image, and only where the text is', async () => {
    const font = loadFont(new Uint8Array(await readFile(FONT)))
    const image = createImageData(400, 120, { fill: { r: 255, g: 255, b: 255, a: 1 } })

    drawText(image, { text: 'Open Farming', font, size: 48, x: 20, y: 80, color: { r: 0, g: 0, b: 0 } })

    let dark = 0
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i]! < 128) dark++
    }

    // Some pixels are inked...
    expect(dark).toBeGreaterThan(200)
    // ...and most of the canvas is not.
    expect(dark).toBeLessThan(400 * 120 * 0.5)

    // The corner is well clear of a baseline-80 run starting at x=20.
    const corner = (399 + 0 * 400) * 4
    expect(image.data[corner]).toBe(255)
  })

  it('anti-aliases rather than producing only solid pixels', async () => {
    const font = loadFont(new Uint8Array(await readFile(FONT)))
    const image = createImageData(300, 100, { fill: { r: 255, g: 255, b: 255, a: 1 } })

    drawText(image, { text: 'Oo', font, size: 72, x: 10, y: 80, color: { r: 0, g: 0, b: 0 } })

    let partial = 0
    for (let i = 0; i < image.data.length; i += 4) {
      const value = image.data[i]!
      if (value > 12 && value < 243) partial++
    }

    // A hard-edged (aliased) fill would have almost none of these.
    expect(partial).toBeGreaterThan(50)
  })
})

describe('fillRect', () => {
  it('fills only inside the rectangle, and clips at the edges', () => {
    const image = createImageData(10, 10, { fill: { r: 255, g: 255, b: 255, a: 1 } })

    fillRect(image, { x: 8, y: 8, width: 10, height: 10 }, { r: 0, g: 0, b: 0 })

    const at = (x: number, y: number) => image.data[(y * 10 + x) * 4]
    expect(at(9, 9)).toBe(0)
    expect(at(7, 7)).toBe(255)
  })
})
