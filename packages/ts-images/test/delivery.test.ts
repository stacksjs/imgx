import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createImageDeliveryManifest, decode, negotiateImageFormat, normalizeImageWidths, selectImageVariant } from '../src'

const fixture = join(import.meta.dir, 'fixtures/app-icon.png')
const outputDirectories: string[] = []

afterAll(async () => {
  await Promise.all(outputDirectories.map(directory => rm(directory, { recursive: true, force: true })))
})

describe('image delivery', () => {
  test('negotiates image formats using q-values and fallback', () => {
    expect(negotiateImageFormat('image/webp;q=0.8,image/avif;q=0.9', ['webp', 'avif', 'jpeg'])).toBe('avif')
    expect(negotiateImageFormat('image/gif,*/*;q=0.5', ['webp', 'jpeg'], 'jpeg')).toBe('jpeg')
    expect(negotiateImageFormat('image/avif;q=0,image/webp', ['avif', 'webp'])).toBe('webp')
  })

  test('normalizes widths without accidental upscaling', () => {
    expect(normalizeImageWidths([640, 320, 320, 2048], 1024)).toEqual([320, 640, 1024])
    expect(normalizeImageWidths([2048], 1024, true)).toEqual([2048])
    expect(() => normalizeImageWidths([0], 1024)).toThrow()
  })

  test('generates deterministic responsive variants and response metadata', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'ts-images-delivery-'))
    outputDirectories.push(outDir)
    const options = {
      input: fixture,
      outDir,
      name: 'avatar',
      baseUrl: 'https://cdn.example.com/images/',
      widths: [64, 128],
      formats: ['webp'] as const,
      fallbackFormat: 'png' as const,
      quality: 80,
    }

    const first = await createImageDeliveryManifest(options)
    const second = await createImageDeliveryManifest(options)

    expect(first.source.width).toBeGreaterThanOrEqual(128)
    expect(first.variants).toHaveLength(6)
    expect(second.variants.map(variant => variant.path)).toEqual(first.variants.map(variant => variant.path))
    expect(first.sources.webp).toContain('64w')
    expect(first.placeholder?.hash).toHaveLength(24)

    for (const variant of first.variants) {
      expect(variant.url.startsWith('https://cdn.example.com/images/')).toBe(true)
      const decoded = await decode(new Uint8Array(await readFile(variant.path)))
      expect(decoded.width).toBe(variant.width)
      expect(decoded.height).toBe(variant.height)
    }

    const selected = selectImageVariant(first, { accept: 'image/webp', width: 100 })
    expect(selected.variant.format).toBe('webp')
    expect(selected.variant.width).toBe(128)
    expect(selected.headers.Vary).toBe('Accept')
    expect(selected.headers['Cache-Control']).toContain('immutable')
  })

  test('deduplicates simultaneous identical generations', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'ts-images-dedupe-'))
    outputDirectories.push(outDir)
    const options = { input: fixture, outDir, widths: [48], formats: ['jpeg'] as const, placeholder: false }
    const [first, second] = await Promise.all([
      createImageDeliveryManifest(options),
      createImageDeliveryManifest(options),
    ])
    expect(second.variants.map(variant => variant.cacheKey)).toEqual(first.variants.map(variant => variant.cacheKey))
  })
})
