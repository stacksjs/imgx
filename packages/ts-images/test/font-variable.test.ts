import { describe, expect, it, spyOn } from 'bun:test'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { loadFont } from '../src/font'

/**
 * A variable font loads and draws its default master, and nothing else — the
 * `gvar` deltas that would move the outlines along the weight axis are not
 * applied.
 *
 * That is a quiet trap rather than a limitation, because most families are
 * now distributed as one variable file. Asking Google Fonts for Outfit Bold
 * gets you `Outfit[wght].ttf`, whose default instance is Regular; it parses,
 * it rasterises, and the card ships in the wrong weight with nothing to say
 * so. `variable` reports it and the loader warns once.
 */

const STATIC = '/Users/chris/Code/Fonts/Satoshi/WEB/fonts/Satoshi-Bold.ttf'
const hasStatic = existsSync(STATIC)

describe.if(hasStatic)('variable fonts', () => {
  it('reports a static face as not variable', async () => {
    const font = loadFont(new Uint8Array(await readFile(STATIC)))

    expect(font.variable).toBe(false)
  })

  it('says nothing about a static face', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      loadFont(new Uint8Array(await readFile(STATIC)))
      expect(warn).not.toHaveBeenCalled()
    }
    finally {
      warn.mockRestore()
    }
  })

  it('still parses everything a caller needs', async () => {
    const font = loadFont(new Uint8Array(await readFile(STATIC)))

    expect(font.unitsPerEm).toBeGreaterThan(0)
    expect(font.glyphCount).toBeGreaterThan(0)
    expect(font.glyphIdFor('A'.codePointAt(0)!)).toBeGreaterThan(0)
  })

  it('accepts the opt-out without changing what it reports', async () => {
    const font = loadFont(new Uint8Array(await readFile(STATIC)), { warnOnVariable: false })

    expect(font.variable).toBe(false)
  })
})
