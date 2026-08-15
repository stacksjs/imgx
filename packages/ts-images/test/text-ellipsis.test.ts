import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { loadFont } from '../src/font'
import { layoutText } from '../src/text'

/**
 * Text that overran `maxLines` used to just stop.
 *
 * That is worse than it sounds, because the result is still a grammatical
 * phrase: a card headline capped from "How to maintain muscle while using
 * GLP-1 weight loss medications" to "How to maintain muscle while using
 * GLP-1" does not look truncated, it looks like a different headline. Nobody
 * reviewing the card catches it.
 *
 * `ellipsis` marks the cut. It is off by default so existing layouts keep the
 * metrics they were designed against.
 */

// A real TrueType face is needed to measure anything. Skipped rather than
// failed where one is not on the machine, matching text.test.ts.
const FONT = '/Users/chris/Code/Fonts/Satoshi/WEB/fonts/Satoshi-Bold.ttf'
const hasFont = existsSync(FONT)
const font = hasFont ? loadFont(new Uint8Array(await readFile(FONT))) : (null as never)

const SIZE = 48
const MEASURE = 520
const LONG = 'How to maintain muscle while using GLP-1 weight loss medications'

describe.if(hasFont)('ellipsis', () => {
  it('marks a headline that was cut', () => {
    const { lines } = layoutText({ text: LONG, font, size: SIZE, maxWidth: MEASURE, maxLines: 2, ellipsis: true })

    expect(lines.length).toBe(2)
    expect(lines[lines.length - 1].endsWith('…')).toBe(true)
  })

  it('is off by default, so existing layouts are untouched', () => {
    const withOut = layoutText({ text: LONG, font, size: SIZE, maxWidth: MEASURE, maxLines: 2 })

    expect(withOut.lines.join(' ')).not.toContain('…')
  })

  it('leaves text that fits alone', () => {
    const short = 'Come and see it.'
    const { lines } = layoutText({ text: short, font, size: SIZE, maxWidth: MEASURE, maxLines: 3, ellipsis: true })

    expect(lines).toEqual([short])
  })

  it('does not mark text that exactly fills its last line', () => {
    // Two lines of copy, capped at two: nothing was dropped, so nothing is
    // marked. This is the case a naive line-count check gets wrong.
    const two = layoutText({ text: LONG, font, size: SIZE, maxWidth: MEASURE })
    const exact = layoutText({ text: LONG, font, size: SIZE, maxWidth: MEASURE, maxLines: two.lines.length, ellipsis: true })

    expect(exact.lines.join(' ')).not.toContain('…')
  })

  it('keeps the ellipsised line inside the measure', () => {
    const { lines, width } = layoutText({ text: LONG, font, size: SIZE, maxWidth: MEASURE, maxLines: 2, ellipsis: true })

    expect(lines.length).toBeGreaterThan(0)
    expect(width).toBeLessThanOrEqual(MEASURE)
  })

  it('handles a single word longer than the measure', () => {
    const wall = 'Supercalifragilisticexpialidociousandthensome'
    const { lines } = layoutText({ text: wall, font, size: SIZE, maxWidth: 120, maxLines: 1, ellipsis: true })

    expect(lines.length).toBe(1)
    // Trimmed to fit rather than overflowing the box.
    expect(lines[0].length).toBeLessThan(wall.length)
  })

  it('marks copy dropped from a later paragraph', () => {
    const { lines } = layoutText({
      text: 'First paragraph.\nSecond paragraph that never gets drawn.',
      font,
      size: SIZE,
      maxWidth: MEASURE,
      maxLines: 1,
      ellipsis: true,
    })

    expect(lines.length).toBe(1)
    expect(lines[0].endsWith('…')).toBe(true)
  })
})
