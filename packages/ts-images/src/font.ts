/**
 * A TrueType outline reader.
 *
 * Enough of the SFNT container to turn a string into glyph outlines: the
 * tables that map characters to glyphs (`cmap`), say how wide each one is
 * (`hmtx`/`hhea`), and hold the contours themselves (`loca`/`glyf`).
 *
 * Deliberately not a font library. There is no shaping, no ligature
 * substitution, no bidi, no hinting: the job is drawing a headline onto an
 * image, where the text is short, Latin, and known in advance. Anything
 * beyond that belongs in a real text engine rather than here.
 *
 * CFF outlines (`OTTO`, most .otf files) are a different curve format and a
 * different charstring interpreter; loading one throws rather than pretending.
 */

export interface GlyphPoint {
  x: number
  y: number
  /** Off-curve points are quadratic control points. */
  onCurve: boolean
}

/** One closed contour, in font units. */
export type GlyphContour = GlyphPoint[]

export interface Font {
  /** Font design units per em. Every metric below is in these units. */
  unitsPerEm: number
  ascender: number
  descender: number
  lineGap: number
  glyphCount: number
  /** 0 when the font has no glyph for the code point. */
  glyphIdFor: (codePoint: number) => number
  advanceWidth: (glyphId: number) => number
  /** Contours in font units, y up. Empty for blank glyphs such as space. */
  outline: (glyphId: number) => GlyphContour[]
}

interface TableRecord {
  offset: number
  length: number
}

class Reader {
  private view: DataView
  offset = 0

  constructor(private bytes: Uint8Array, start = 0) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.offset = start
  }

  seek(offset: number): this {
    this.offset = offset
    return this
  }

  uint8(): number { return this.view.getUint8(this.offset++) }
  int8(): number { return this.view.getInt8(this.offset++) }
  uint16(): number { const v = this.view.getUint16(this.offset); this.offset += 2; return v }
  int16(): number { const v = this.view.getInt16(this.offset); this.offset += 2; return v }
  uint32(): number { const v = this.view.getUint32(this.offset); this.offset += 4; return v }

  /** F2Dot14: a signed fixed-point value used by composite glyph transforms. */
  f2dot14(): number { return this.int16() / 16384 }

  tag(): string {
    let out = ''
    for (let i = 0; i < 4; i++) out += String.fromCharCode(this.uint8())
    return out
  }

  get length(): number { return this.bytes.length }
}

/**
 * Parse a TrueType font.
 *
 * @param bytes the raw .ttf contents
 */
export function loadFont(bytes: Uint8Array): Font {
  const reader = new Reader(bytes)
  const version = reader.uint32()

  // 0x4F54544F is 'OTTO': an OpenType font with CFF (PostScript) outlines.
  if (version === 0x4F54544F)
    throw new Error('ts-images: CFF/OpenType outlines are not supported; supply a TrueType (glyf) font')

  // 0x74746366 is 'ttcf': a collection holding several fonts.
  if (version === 0x74746366)
    throw new Error('ts-images: TrueType collections are not supported; extract a single font first')

  if (version !== 0x00010000 && version !== 0x74727565)
    throw new Error(`ts-images: unrecognised font format (0x${version.toString(16)})`)

  const numTables = reader.uint16()
  reader.offset += 6 // searchRange, entrySelector, rangeShift

  const tables = new Map<string, TableRecord>()
  for (let i = 0; i < numTables; i++) {
    const tag = reader.tag()
    reader.offset += 4 // checksum
    const offset = reader.uint32()
    const length = reader.uint32()
    tables.set(tag, { offset, length })
  }

  const need = (tag: string): TableRecord => {
    const table = tables.get(tag)
    if (!table)
      throw new Error(`ts-images: font is missing the required '${tag}' table`)
    return table
  }

  // head — units per em, and how `loca` is encoded.
  const head = need('head')
  reader.seek(head.offset + 18)
  const unitsPerEm = reader.uint16()
  reader.seek(head.offset + 50)
  const indexToLocFormat = reader.int16()

  // hhea — vertical metrics and how many glyphs carry their own advance.
  const hhea = need('hhea')
  reader.seek(hhea.offset + 4)
  const ascender = reader.int16()
  const descender = reader.int16()
  const lineGap = reader.int16()
  reader.seek(hhea.offset + 34)
  const numberOfHMetrics = reader.uint16()

  // maxp — glyph count.
  const maxp = need('maxp')
  reader.seek(maxp.offset + 4)
  const glyphCount = reader.uint16()

  // loca — byte offset of each glyph inside `glyf`, plus a terminator.
  const loca = need('loca')
  const glyphOffsets = new Uint32Array(glyphCount + 1)
  reader.seek(loca.offset)
  if (indexToLocFormat === 0) {
    // Short format stores offsets halved, so they fit in a uint16.
    for (let i = 0; i <= glyphCount; i++) glyphOffsets[i] = reader.uint16() * 2
  }
  else {
    for (let i = 0; i <= glyphCount; i++) glyphOffsets[i] = reader.uint32()
  }

  const glyf = need('glyf')
  const cmap = parseCmap(reader, need('cmap').offset)
  const advances = parseHmtx(reader, need('hmtx').offset, numberOfHMetrics, glyphCount)

  // Outlines are parsed on demand and remembered: a headline reuses the same
  // few dozen glyphs, and composite glyphs read their components repeatedly.
  const outlineCache = new Map<number, GlyphContour[]>()

  const outline = (glyphId: number): GlyphContour[] => {
    const cached = outlineCache.get(glyphId)
    if (cached)
      return cached

    const contours = readGlyph(reader, glyf.offset, glyphOffsets, glyphId, outline, 0)
    outlineCache.set(glyphId, contours)
    return contours
  }

  return {
    unitsPerEm,
    ascender,
    descender,
    lineGap,
    glyphCount,
    glyphIdFor: (codePoint: number) => cmap.get(codePoint) ?? 0,
    advanceWidth: (glyphId: number) => advances[Math.min(glyphId, advances.length - 1)] ?? 0,
    outline,
  }
}

/** Advance width per glyph. Glyphs past `numberOfHMetrics` reuse the last one. */
function parseHmtx(reader: Reader, offset: number, numberOfHMetrics: number, glyphCount: number): Uint16Array {
  const advances = new Uint16Array(glyphCount)
  reader.seek(offset)

  let last = 0
  for (let i = 0; i < numberOfHMetrics && i < glyphCount; i++) {
    last = reader.uint16()
    reader.offset += 2 // leftSideBearing
    advances[i] = last
  }

  // Monospaced tails: every remaining glyph has the final advance.
  for (let i = numberOfHMetrics; i < glyphCount; i++) advances[i] = last

  return advances
}

/**
 * Character-to-glyph map.
 *
 * Prefers a full-Unicode subtable (format 12) over the basic-plane one
 * (format 4), so a font that carries both is read at its full coverage.
 */
function parseCmap(reader: Reader, offset: number): Map<number, number> {
  reader.seek(offset + 2)
  const numSubtables = reader.uint16()

  let best: { offset: number, score: number } | null = null
  for (let i = 0; i < numSubtables; i++) {
    const platformId = reader.uint16()
    const encodingId = reader.uint16()
    const subtableOffset = reader.uint32()

    // Higher is better: full Unicode beats the basic plane beats anything else.
    let score = 0
    if (platformId === 3 && encodingId === 10) score = 4
    else if (platformId === 0 && encodingId >= 4) score = 3
    else if (platformId === 3 && encodingId === 1) score = 2
    else if (platformId === 0) score = 1

    if (score > 0 && (!best || score > best.score))
      best = { offset: offset + subtableOffset, score }
  }

  if (!best)
    throw new Error('ts-images: font has no Unicode cmap subtable')

  reader.seek(best.offset)
  const format = reader.uint16()

  if (format === 4)
    return parseCmapFormat4(reader, best.offset)

  if (format === 12)
    return parseCmapFormat12(reader, best.offset)

  throw new Error(`ts-images: unsupported cmap format ${format}`)
}

function parseCmapFormat4(reader: Reader, offset: number): Map<number, number> {
  reader.seek(offset + 6)
  const segCountX2 = reader.uint16()
  const segCount = segCountX2 / 2

  reader.offset += 6 // searchRange, entrySelector, rangeShift

  const endCodes = new Uint16Array(segCount)
  for (let i = 0; i < segCount; i++) endCodes[i] = reader.uint16()
  reader.offset += 2 // reservedPad

  const startCodes = new Uint16Array(segCount)
  for (let i = 0; i < segCount; i++) startCodes[i] = reader.uint16()

  const idDeltas = new Int16Array(segCount)
  for (let i = 0; i < segCount; i++) idDeltas[i] = reader.int16()

  const rangeOffsetPosition = reader.offset
  const idRangeOffsets = new Uint16Array(segCount)
  for (let i = 0; i < segCount; i++) idRangeOffsets[i] = reader.uint16()

  const map = new Map<number, number>()
  for (let segment = 0; segment < segCount; segment++) {
    const start = startCodes[segment]!
    const end = endCodes[segment]!
    if (start === 0xFFFF)
      continue

    for (let code = start; code <= end && code !== 0x10000; code++) {
      let glyphId: number

      if (idRangeOffsets[segment] === 0) {
        glyphId = (code + idDeltas[segment]!) & 0xFFFF
      }
      else {
        // The offset is measured from the position of the entry itself.
        const glyphIndexAddress = rangeOffsetPosition + segment * 2 + idRangeOffsets[segment]! + (code - start) * 2
        if (glyphIndexAddress + 1 >= reader.length)
          continue

        glyphId = reader.seek(glyphIndexAddress).uint16()
        if (glyphId !== 0)
          glyphId = (glyphId + idDeltas[segment]!) & 0xFFFF
      }

      if (glyphId !== 0)
        map.set(code, glyphId)
    }
  }

  return map
}

function parseCmapFormat12(reader: Reader, offset: number): Map<number, number> {
  reader.seek(offset + 12)
  const numGroups = reader.uint32()

  const map = new Map<number, number>()
  for (let i = 0; i < numGroups; i++) {
    const startChar = reader.uint32()
    const endChar = reader.uint32()
    const startGlyph = reader.uint32()

    // A pathological font could declare an enormous range; cap the work.
    const span = Math.min(endChar - startChar, 0xFFFF)
    for (let n = 0; n <= span; n++) map.set(startChar + n, startGlyph + n)
  }

  return map
}

const ON_CURVE = 0x01
const X_SHORT = 0x02
const Y_SHORT = 0x04
const REPEAT = 0x08
const X_SAME_OR_POSITIVE = 0x10
const Y_SAME_OR_POSITIVE = 0x20

const ARG_1_AND_2_ARE_WORDS = 0x0001
const ARGS_ARE_XY_VALUES = 0x0002
const WE_HAVE_A_SCALE = 0x0008
const MORE_COMPONENTS = 0x0020
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040
const WE_HAVE_A_TWO_BY_TWO = 0x0080
const WE_HAVE_INSTRUCTIONS = 0x0100

function readGlyph(
  reader: Reader,
  glyfOffset: number,
  glyphOffsets: Uint32Array,
  glyphId: number,
  outline: (id: number) => GlyphContour[],
  depth: number,
): GlyphContour[] {
  if (glyphId < 0 || glyphId + 1 >= glyphOffsets.length)
    return []

  const start = glyphOffsets[glyphId]!
  const end = glyphOffsets[glyphId + 1]!

  // Equal offsets mean the glyph has no outline: space, and friends.
  if (end <= start)
    return []

  reader.seek(glyfOffset + start)
  const numberOfContours = reader.int16()
  reader.offset += 8 // xMin, yMin, xMax, yMax

  if (numberOfContours >= 0)
    return readSimpleGlyph(reader, numberOfContours)

  // A composite glyph references others. Bounded because a malformed font can
  // describe a cycle, and this would otherwise not terminate.
  if (depth > 5)
    return []

  return readCompositeGlyph(reader, outline, depth)
}

function readSimpleGlyph(reader: Reader, numberOfContours: number): GlyphContour[] {
  const endPts = new Uint16Array(numberOfContours)
  for (let i = 0; i < numberOfContours; i++) endPts[i] = reader.uint16()

  const pointCount = numberOfContours > 0 ? endPts[numberOfContours - 1]! + 1 : 0

  const instructionLength = reader.uint16()
  reader.offset += instructionLength

  // Flags, run-length encoded via the REPEAT bit.
  const flags = new Uint8Array(pointCount)
  for (let i = 0; i < pointCount;) {
    const flag = reader.uint8()
    flags[i++] = flag

    if (flag & REPEAT) {
      let repeats = reader.uint8()
      while (repeats-- > 0 && i < pointCount) flags[i++] = flag
    }
  }

  // Coordinates are deltas, each optionally a byte with its sign in a flag.
  const xs = new Int16Array(pointCount)
  let x = 0
  for (let i = 0; i < pointCount; i++) {
    const flag = flags[i]!
    if (flag & X_SHORT)
      x += (flag & X_SAME_OR_POSITIVE) ? reader.uint8() : -reader.uint8()
    else if (!(flag & X_SAME_OR_POSITIVE))
      x += reader.int16()

    xs[i] = x
  }

  const ys = new Int16Array(pointCount)
  let y = 0
  for (let i = 0; i < pointCount; i++) {
    const flag = flags[i]!
    if (flag & Y_SHORT)
      y += (flag & Y_SAME_OR_POSITIVE) ? reader.uint8() : -reader.uint8()
    else if (!(flag & Y_SAME_OR_POSITIVE))
      y += reader.int16()

    ys[i] = y
  }

  const contours: GlyphContour[] = []
  let pointIndex = 0
  for (let c = 0; c < numberOfContours; c++) {
    const contourEnd = endPts[c]!
    const contour: GlyphContour = []

    for (; pointIndex <= contourEnd; pointIndex++) {
      contour.push({
        x: xs[pointIndex]!,
        y: ys[pointIndex]!,
        onCurve: (flags[pointIndex]! & ON_CURVE) !== 0,
      })
    }

    if (contour.length > 0)
      contours.push(contour)
  }

  return contours
}

function readCompositeGlyph(
  reader: Reader,
  outline: (id: number) => GlyphContour[],
  depth: number,
): GlyphContour[] {
  const contours: GlyphContour[] = []
  let more = true

  while (more) {
    const flags = reader.uint16()
    const componentId = reader.uint16()

    let dx = 0
    let dy = 0
    if (flags & ARG_1_AND_2_ARE_WORDS) {
      const a = reader.int16()
      const b = reader.int16()
      if (flags & ARGS_ARE_XY_VALUES) { dx = a; dy = b }
    }
    else {
      const a = reader.int8()
      const b = reader.int8()
      if (flags & ARGS_ARE_XY_VALUES) { dx = a; dy = b }
    }

    // Point-matching placement (no ARGS_ARE_XY_VALUES) is vanishingly rare in
    // text faces; the component lands unshifted rather than in the wrong place.
    let a = 1
    let b = 0
    let c = 0
    let d = 1
    if (flags & WE_HAVE_A_SCALE) {
      a = d = reader.f2dot14()
    }
    else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
      a = reader.f2dot14()
      d = reader.f2dot14()
    }
    else if (flags & WE_HAVE_A_TWO_BY_TWO) {
      a = reader.f2dot14()
      b = reader.f2dot14()
      c = reader.f2dot14()
      d = reader.f2dot14()
    }

    // The component's own parse moves the cursor, so remember where we were.
    const resume = reader.offset
    for (const contour of outline(componentId)) {
      contours.push(contour.map(point => ({
        x: a * point.x + c * point.y + dx,
        y: b * point.x + d * point.y + dy,
        onCurve: point.onCurve,
      })))
    }
    reader.seek(resume)

    more = (flags & MORE_COMPONENTS) !== 0
    if (!more && (flags & WE_HAVE_INSTRUCTIONS)) {
      const instructionLength = reader.uint16()
      reader.offset += instructionLength
    }
  }

  return contours
}

/**
 * Flatten a glyph's contours into closed polylines, in font units.
 *
 * TrueType contours are quadratic B-splines: consecutive off-curve points
 * imply an on-curve point at their midpoint, and a contour may begin on an
 * off-curve point. Both cases are normalised here so the rasteriser only ever
 * sees straight edges.
 */
export function flattenContours(contours: GlyphContour[], segmentsPerCurve = 8): { x: number, y: number }[][] {
  const polygons: { x: number, y: number }[][] = []

  for (const contour of contours) {
    if (contour.length === 0)
      continue

    // Normalise: insert the implied on-curve midpoints, and rotate so the
    // contour starts on the curve.
    const points: GlyphPoint[] = []
    for (let i = 0; i < contour.length; i++) {
      const current = contour[i]!
      const next = contour[(i + 1) % contour.length]!
      points.push(current)

      if (!current.onCurve && !next.onCurve) {
        points.push({
          x: (current.x + next.x) / 2,
          y: (current.y + next.y) / 2,
          onCurve: true,
        })
      }
    }

    const startIndex = points.findIndex(point => point.onCurve)
    if (startIndex === -1)
      continue

    const ordered = [...points.slice(startIndex), ...points.slice(0, startIndex)]
    const polygon: { x: number, y: number }[] = [{ x: ordered[0]!.x, y: ordered[0]!.y }]

    for (let i = 1; i <= ordered.length; i++) {
      const point = ordered[i % ordered.length]!

      if (point.onCurve) {
        polygon.push({ x: point.x, y: point.y })
        continue
      }

      // Quadratic: current end point, this control point, the next on-curve.
      const from = polygon[polygon.length - 1]!
      const to = ordered[(i + 1) % ordered.length]!
      for (let step = 1; step <= segmentsPerCurve; step++) {
        const t = step / segmentsPerCurve
        const inverse = 1 - t
        polygon.push({
          x: inverse * inverse * from.x + 2 * inverse * t * point.x + t * t * to.x,
          y: inverse * inverse * from.y + 2 * inverse * t * point.y + t * t * to.y,
        })
      }

      i++ // the on-curve end point was consumed by the curve
    }

    if (polygon.length > 2)
      polygons.push(polygon)
  }

  return polygons
}
