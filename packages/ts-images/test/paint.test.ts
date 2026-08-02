import type { ImageData } from '../src/core/image-data'
import { describe, expect, it } from 'bun:test'
import { createImageData } from '../src/core/image-data'
import { drawImage, dropShadow, fillLinearGradient, fillRadialGradient, parseColor } from '../src/paint'

const BLACK = { r: 0, g: 0, b: 0 }
const WHITE = { r: 255, g: 255, b: 255 }

function canvas(width: number, height: number, fill = 0): ImageData {
  const image = createImageData(width, height)
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = fill
    image.data[i + 1] = fill
    image.data[i + 2] = fill
    image.data[i + 3] = 255
  }
  return image
}

function channel(image: ImageData, x: number, y: number, index = 0): number {
  return image.data[(y * image.width + x) * 4 + index]!
}

describe('fillLinearGradient', () => {
  it('runs top to bottom by default', () => {
    const image = canvas(20, 100)
    fillLinearGradient(image, { x: 0, y: 0, width: 20, height: 100 }, [
      { offset: 0, color: BLACK },
      { offset: 1, color: WHITE },
    ])

    expect(channel(image, 10, 0)).toBeLessThan(10)
    expect(channel(image, 10, 99)).toBeGreaterThan(245)
    expect(channel(image, 10, 50)).toBeGreaterThan(100)
    expect(channel(image, 10, 50)).toBeLessThan(155)
  })

  it('runs left to right at 90 degrees', () => {
    const image = canvas(100, 20)
    fillLinearGradient(image, { x: 0, y: 0, width: 100, height: 20 }, [
      { offset: 0, color: BLACK },
      { offset: 1, color: WHITE },
    ], { angle: 90 })

    expect(channel(image, 0, 10)).toBeLessThan(10)
    expect(channel(image, 99, 10)).toBeGreaterThan(245)
  })

  it('honours intermediate stops', () => {
    const image = canvas(10, 100)
    fillLinearGradient(image, { x: 0, y: 0, width: 10, height: 100 }, [
      { offset: 0, color: BLACK },
      { offset: 0.5, color: { r: 255, g: 0, b: 0 } },
      { offset: 1, color: BLACK },
    ])

    expect(channel(image, 5, 50)).toBeGreaterThan(245)
    expect(channel(image, 5, 0)).toBeLessThan(10)
    expect(channel(image, 5, 99)).toBeLessThan(10)
  })

  it('composites a translucent wash rather than replacing it', () => {
    const image = canvas(10, 10, 200)
    fillLinearGradient(image, { x: 0, y: 0, width: 10, height: 10 }, [
      { offset: 0, color: { ...BLACK, a: 0.5 } },
      { offset: 1, color: { ...BLACK, a: 0.5 } },
    ])

    expect(channel(image, 5, 5)).toBe(100)
  })

  it('rejects an empty stop list', () => {
    const image = canvas(10, 10)
    expect(() => fillLinearGradient(image, { x: 0, y: 0, width: 10, height: 10 }, [])).toThrow()
  })
})

describe('fillRadialGradient', () => {
  it('paints the centre and leaves everything past the radius alone', () => {
    const image = canvas(60, 60)
    fillRadialGradient(image, { cx: 30, cy: 30, radius: 20 }, [
      { offset: 0, color: WHITE },
      { offset: 1, color: { ...WHITE, a: 0 } },
    ])

    expect(channel(image, 30, 30)).toBeGreaterThan(245)
    expect(channel(image, 0, 0)).toBe(0)
    expect(channel(image, 59, 30)).toBe(0)
  })

  it('fades out towards the edge', () => {
    const image = canvas(60, 60)
    fillRadialGradient(image, { cx: 30, cy: 30, radius: 25 }, [
      { offset: 0, color: WHITE },
      { offset: 1, color: { ...WHITE, a: 0 } },
    ])

    expect(channel(image, 42, 30)).toBeLessThan(channel(image, 34, 30))
  })
})

describe('drawImage', () => {
  it('places the source at an offset', () => {
    const target = canvas(40, 40)
    const source = canvas(10, 10, 255)

    const box = drawImage(target, source, { x: 5, y: 7 })

    expect(box).toEqual({ x: 5, y: 7, width: 10, height: 10 })
    expect(channel(target, 5, 7)).toBe(255)
    expect(channel(target, 14, 16)).toBe(255)
    expect(channel(target, 4, 7)).toBe(0)
    expect(channel(target, 15, 7)).toBe(0)
  })

  it('resamples to the requested box', () => {
    const target = canvas(60, 60)
    const source = canvas(10, 10, 255)

    const box = drawImage(target, source, { x: 0, y: 0, width: 40, height: 40 })

    expect(box.width).toBe(40)
    expect(channel(target, 39, 39)).toBeGreaterThan(200)
    expect(channel(target, 41, 41)).toBe(0)
  })

  it('masks the corners when a radius is given', () => {
    const target = canvas(40, 40)
    const source = canvas(30, 30, 255)

    drawImage(target, source, { x: 5, y: 5, radius: 12 })

    // The centre of a rounded box is covered; its corner is cut away.
    expect(channel(target, 20, 20)).toBe(255)
    expect(channel(target, 5, 5)).toBe(0)
    expect(channel(target, 34, 34)).toBe(0)
  })

  it('multiplies the source alpha by the opacity', () => {
    const target = canvas(20, 20)
    const source = canvas(10, 10, 255)

    drawImage(target, source, { x: 0, y: 0, opacity: 0.5 })

    expect(channel(target, 5, 5)).toBeGreaterThan(120)
    expect(channel(target, 5, 5)).toBeLessThan(136)
  })

  it('clips to the canvas', () => {
    const target = canvas(20, 20)
    const source = canvas(30, 30, 255)

    expect(() => drawImage(target, source, { x: 15, y: 15 })).not.toThrow()
    expect(channel(target, 19, 19)).toBe(255)
  })
})

describe('dropShadow', () => {
  it('darkens under and around the silhouette', () => {
    const image = canvas(120, 120, 255)
    dropShadow(image, { x: 40, y: 40, width: 40, height: 40, radius: 8 }, { blur: 12 })

    expect(channel(image, 60, 60)).toBeLessThan(200)
    // Softness: the edge is a ramp rather than a step.
    const inside = channel(image, 60, 60)
    const outside = channel(image, 60, 88)
    expect(outside).toBeGreaterThan(inside)
    expect(outside).toBeLessThan(255)
  })

  it('follows its offset', () => {
    const image = canvas(160, 160, 255)
    dropShadow(image, { x: 60, y: 60, width: 40, height: 40, radius: 8 }, { blur: 6, offsetY: 30 })

    // Below the box is in shadow; the same distance above it is not.
    expect(channel(image, 80, 100)).toBeLessThan(channel(image, 80, 40))
  })

  it('leaves distant pixels untouched', () => {
    const image = canvas(200, 200, 255)
    dropShadow(image, { x: 90, y: 90, width: 20, height: 20, radius: 4 }, { blur: 8 })

    expect(channel(image, 2, 2)).toBe(255)
    expect(channel(image, 197, 197)).toBe(255)
  })
})

describe('parseColor', () => {
  it('reads the hex forms', () => {
    expect(parseColor('#ef4444')).toEqual({ r: 239, g: 68, b: 68, a: 1 })
    expect(parseColor('ef4444')).toEqual({ r: 239, g: 68, b: 68, a: 1 })
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
  })

  it('reads alpha out of the eight-digit form', () => {
    const color = parseColor('#ef444480')
    expect(color.r).toBe(239)
    expect(color.a).toBeCloseTo(0.5, 1)
  })

  it('reads the functional forms', () => {
    expect(parseColor('rgb(239, 68, 68)')).toEqual({ r: 239, g: 68, b: 68, a: 1 })
    expect(parseColor('rgba(239, 68, 68, 0.4)')).toEqual({ r: 239, g: 68, b: 68, a: 0.4 })
    expect(parseColor('rgb(239 68 68 / 40%)').a).toBeCloseTo(0.4, 5)
  })

  it('rejects what it cannot read', () => {
    expect(() => parseColor('rebeccapurple')).toThrow(/Unsupported colour/)
    expect(() => parseColor('#ff')).toThrow(/Unsupported colour/)
  })
})
