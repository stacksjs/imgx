import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createImageDeliveryCatalog, createImageDeliveryManifest, decode, negotiateImageFormat, normalizeImageWidths, resolveImageDeliveryOptions, selectImageVariant } from '../src'

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

  test('emits decodable AVIF variants instead of advertising stub containers', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'ts-images-avif-'))
    outputDirectories.push(outDir)
    const manifest = await createImageDeliveryManifest({
      input: join(import.meta.dir, 'fixtures/og-image.jpg'),
      outDir,
      widths: [64],
      formats: ['avif'],
      fallbackFormat: 'jpeg',
      includeOriginal: false,
      placeholder: false,
    })
    const avif = manifest.variants.find(variant => variant.format === 'avif')
    expect(avif).toBeDefined()
    const decoded = await decode(new Uint8Array(await readFile(avif!.path)))
    expect(decoded.width).toBe(64)
    expect(decoded.height).toBeGreaterThan(0)
  })

  test('builds a deterministic catalog with bounded source concurrency', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'ts-images-catalog-'))
    outputDirectories.push(outDir)
    const input = join(import.meta.dir, 'fixtures/og-image.jpg')
    const options = {
      entries: [
        { key: '/images/hero.jpg', input },
        { key: '/images/card.jpg', input },
      ],
      outDir,
      baseUrl: '/_images',
      widths: [64],
      formats: ['webp'] as const,
      fallbackFormat: 'jpeg' as const,
      includeOriginal: false,
      batchConcurrency: 2,
    }
    const first = await createImageDeliveryCatalog(options)
    const second = await createImageDeliveryCatalog(options)

    expect(Object.keys(first.entries)).toEqual(['/images/hero.jpg', '/images/card.jpg'])
    expect(first.fingerprint).toHaveLength(64)
    expect(second.fingerprint).toBe(first.fingerprint)
    expect(first.entries['/images/hero.jpg'].sources.webp).toContain('/_images/')
  })

  test('rejects duplicate catalog keys before processing files', async () => {
    await expect(createImageDeliveryCatalog({
      entries: [
        { key: '/same.jpg', input: new Uint8Array() },
        { key: '/same.jpg', input: new Uint8Array() },
      ],
      outDir: '/tmp/ts-images-duplicate-key-test',
    })).rejects.toThrow('Duplicate image catalog key')
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

  test('applies named crop presets before resolving defaults', () => {
    const options = resolveImageDeliveryOptions({ input: fixture, outDir: '/tmp/images', preset: 'avatar', widths: [32] })
    expect(options.widths).toEqual([32])
    expect(options.aspectRatio).toBe(1)
    expect(options.fit).toBe('cover')
  })

  test('authorizes before reading source metadata', async () => {
    let called = false
    await expect(createImageDeliveryManifest({
      input: '/path/that/must/not/be/read.png',
      outDir: '/tmp/images',
      authorize: () => {
        called = true
        return false
      },
    })).rejects.toThrow('not authorized')
    expect(called).toBe(true)
  })

  test('publishes variants through a storage adapter', async () => {
    const objects = new Map<string, Uint8Array>()
    const manifest = await createImageDeliveryManifest({
      input: fixture,
      preset: 'avatar',
      widths: [32],
      formats: ['webp'],
      fallbackFormat: 'png',
      placeholder: false,
      storage: {
        cacheNamespace: 'test-memory',
        stat: async key => objects.has(key) ? { bytes: objects.get(key)!.byteLength, url: `https://cdn.example/${key}` } : null,
        write: async (key, bytes) => { objects.set(key, bytes) },
      },
    })
    expect(manifest.variants).toHaveLength(2)
    expect(manifest.variants.every(variant => variant.width === 32 && variant.height === 32)).toBe(true)
    expect(manifest.variants.every(variant => variant.url.startsWith('https://cdn.example/'))).toBe(true)
  })
})
