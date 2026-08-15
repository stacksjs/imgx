import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { loadFont } from '../src/font'
import { layoutText } from '../src/text'

/**
 * The subtitle is the line that carries the specifics — a price, a date, what
 * the thing actually is — and it was capped at one line and not ellipsised.
 * Anything longer than the measure was cut mid-word, so a card promising
 * "Pool, tennis, squash, strength, recovery, and coaching" shipped reading
 * "Pool, tennis, squash, strength, recovery," and looked broken rather than
 * terse.
 *
 * It now wraps, and the block it reserves is measured rather than assumed, so
 * a wrapped subtitle pushes the headline up instead of colliding with it.
 *
 * These cover the layout arithmetic. Rendering is exercised by generating a
 * card and looking at it.
 */

// A real TrueType face is needed to measure anything. Skipped rather than
// failed where one is not on the machine, matching text.test.ts.
const FONT = '/Users/chris/Code/Fonts/Satoshi/WEB/fonts/Satoshi-Bold.ttf'
const hasFont = existsSync(FONT)
const font = hasFont ? loadFont(new Uint8Array(await readFile(FONT))) : (null as never)

const W = 1200
const H = 630
const PAD = Math.round(W * 0.067)
const SIZE = Math.round(W * 0.0245)
const MEASURE = Math.round(W * 0.54)

/** The block og.ts reserves under the title, as it computes it. */
function subtitleBlock(text: string | undefined, maxLines = 2) {
  if (!text)
    return { block: 0, lines: [] as string[], lastBaseline: H - PAD - SIZE * 0.15, firstBaseline: H - PAD - SIZE * 0.15 }

  const metrics = layoutText({ text, font, size: SIZE, maxWidth: MEASURE, lineHeight: 1.35, maxLines })
  const block = SIZE * 1.35 + (metrics.lines.length - 1) * metrics.lineHeight + PAD * 0.32
  const lastBaseline = H - PAD - SIZE * 0.15

  return {
    block,
    lines: metrics.lines,
    lastBaseline,
    firstBaseline: lastBaseline - (metrics.lines.length - 1) * metrics.lineHeight,
  }
}

const LONG = 'Pool, tennis, squash, strength, recovery, and coaching across 29,000 square feet.'
const SHORT = 'From $189 a month.'

describe.if(hasFont)('subtitle wrapping', () => {
  it('wraps a long subtitle rather than dropping the end of it', () => {
    const { lines } = subtitleBlock(LONG)

    expect(lines.length).toBe(2)
    // Every word survives, in order.
    expect(lines.join(' ')).toBe(LONG)
  })

  it('leaves a short subtitle on one line', () => {
    const { lines, block } = subtitleBlock(SHORT)

    expect(lines).toEqual([SHORT])
    expect(block).toBeCloseTo(SIZE * 1.35 + PAD * 0.32, 5)
  })

  it('reserves more room for two lines than for one', () => {
    expect(subtitleBlock(LONG).block).toBeGreaterThan(subtitleBlock(SHORT).block)
  })

  it('honours a cap of one, for a caller that wants the old behaviour', () => {
    expect(subtitleBlock(LONG, 1).lines.length).toBe(1)
  })

  it('reserves nothing when there is no subtitle', () => {
    expect(subtitleBlock(undefined).block).toBe(0)
  })
})

describe.if(hasFont)('subtitle baselines', () => {
  it('keeps the last line on the baseline a single line always used', () => {
    const one = subtitleBlock(SHORT)
    const two = subtitleBlock(LONG)

    // The foot of the card does not move when the subtitle wraps: the extra
    // line is added above, not below.
    expect(two.lastBaseline).toBe(one.lastBaseline)
  })

  it('starts a wrapped subtitle a line-height higher', () => {
    const two = subtitleBlock(LONG)
    const metrics = layoutText({ text: LONG, font, size: SIZE, maxWidth: MEASURE, lineHeight: 1.35, maxLines: 2 })

    expect(two.lastBaseline - two.firstBaseline).toBeCloseTo(metrics.lineHeight, 5)
  })

  it('does not let the reserved block fall short of the drawn lines', () => {
    const { block, lines } = subtitleBlock(LONG)
    const drawn = SIZE * 1.35 * lines.length

    expect(block).toBeGreaterThanOrEqual(drawn)
  })
})
