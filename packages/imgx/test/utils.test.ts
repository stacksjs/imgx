import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { getFiles, isPathMatching, watchFiles } from '../src/utils'

const OUTPUT_DIR = join(import.meta.dir, 'output')

describe('utils', () => {
  beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true })
  })

  afterAll(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
  })

  afterEach(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
      .catch(() => {})
    await mkdir(OUTPUT_DIR, { recursive: true })
  })

  describe('getFiles', () => {
    it('should get files matching patterns', async () => {
      // Create test files
      await Bun.write(join(OUTPUT_DIR, 'test1.jpg'), 'test')
      await Bun.write(join(OUTPUT_DIR, 'test2.png'), 'test')
      await Bun.write(join(OUTPUT_DIR, 'test3.txt'), 'test')
      await mkdir(join(OUTPUT_DIR, 'subdir'), { recursive: true })
      await Bun.write(join(OUTPUT_DIR, 'subdir', 'test4.webp'), 'test')

      const files = await getFiles(OUTPUT_DIR, {
        patterns: ['**/*.jpg', '**/*.png', '**/*.webp'],
      })

      expect(files.length).toBe(3)
      expect(files.some(f => f.endsWith('test1.jpg'))).toBe(true)
      expect(files.some(f => f.endsWith('test2.png'))).toBe(true)
      expect(files.some(f => f.endsWith('test4.webp'))).toBe(true)
      expect(files.every(f => !f.endsWith('test3.txt'))).toBe(true)
    })

    it('should respect ignore patterns', async () => {
      // Create test files
      await Bun.write(join(OUTPUT_DIR, 'test1.jpg'), 'test')
      await mkdir(join(OUTPUT_DIR, 'subdir'), { recursive: true })
      await Bun.write(join(OUTPUT_DIR, 'subdir', 'test2.jpg'), 'test')

      const files = await getFiles(OUTPUT_DIR, {
        patterns: ['**/*.jpg'],
        ignore: ['**/subdir/**'],
      })

      expect(files.length).toBe(1)
      expect(files[0].endsWith('test1.jpg')).toBe(true)
    })

    it('should respect maxDepth option', async () => {
      // Create test files
      await Bun.write(join(OUTPUT_DIR, 'test1.jpg'), 'test')
      await mkdir(join(OUTPUT_DIR, 'subdir'), { recursive: true })
      await Bun.write(join(OUTPUT_DIR, 'subdir', 'test2.jpg'), 'test')
      await mkdir(join(OUTPUT_DIR, 'subdir', 'subsubdir'), { recursive: true })
      await Bun.write(join(OUTPUT_DIR, 'subdir', 'subsubdir', 'test3.jpg'), 'test')

      const files = await getFiles(OUTPUT_DIR, {
        patterns: ['**/*.jpg'],
        maxDepth: 1,
      })

      expect(files.length).toBe(2)
      expect(files.some(f => f.endsWith('test1.jpg'))).toBe(true)
      expect(files.some(f => f.endsWith('test2.jpg'))).toBe(true)
      expect(files.every(f => !f.endsWith('test3.jpg'))).toBe(true)
    })

    it('should handle non-directory paths', async () => {
      const filePath = join(OUTPUT_DIR, 'test.jpg')
      await Bun.write(filePath, 'test')

      const files = await getFiles(filePath)

      expect(files.length).toBe(1)
      expect(files[0]).toBe(filePath)
    })
  })

  describe('isPathMatching', () => {
    it('should match paths against patterns', () => {
      expect(isPathMatching('test.jpg', ['*.jpg'])).toBe(true)
      expect(isPathMatching('test.png', ['*.jpg'])).toBe(false)
      expect(isPathMatching('test.png', ['*.jpg', '*.png'])).toBe(true)
      expect(isPathMatching('path/to/test.jpg', ['**/*.jpg'])).toBe(true)
    })
  })

  describe('watchFiles', () => {
    it('should set up file watching and return cleanup function', async () => {
      // Create test file
      const filePath = join(OUTPUT_DIR, 'watch-test.jpg')
      await Bun.write(filePath, 'test')

      let callbackCalled = false
      const cleanup = await watchFiles(
        OUTPUT_DIR,
        ['**/*.jpg'],
        () => { callbackCalled = true },
      )

      expect(typeof cleanup).toBe('function')

      // Call cleanup to end watching
      cleanup()
    })
  })
})
