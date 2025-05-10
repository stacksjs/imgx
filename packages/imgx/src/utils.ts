import type { GetFilesOptions, OptimizeResult } from './types'
import { stat } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { config } from './config'

export async function getFiles(
  path: string,
  options: GetFilesOptions = {},
): Promise<string[]> {
  const {
    patterns = ['**/*.{jpg,jpeg,png,webp,avif,svg}'],
    ignore = ['**/node_modules/**'],
    maxDepth,
    ...scanOptions
  } = options

  try {
    const stats = await stat(path)
    if (!stats.isDirectory()) {
      return [resolve(path)]
    }

    const files: Set<string> = new Set()

    // Process include patterns
    for (const pattern of patterns) {
      const glob = new Bun.Glob(pattern)
      for await (const file of glob.scan({
        ...scanOptions,
        cwd: path,
        absolute: true,
        onlyFiles: true,
      })) {
        files.add(file)
      }
    }

    // Process ignore patterns
    if (ignore.length > 0) {
      for (const pattern of ignore) {
        const glob = new Bun.Glob(pattern)
        for await (const file of glob.scan({
          ...scanOptions,
          cwd: path,
          absolute: true,
          onlyFiles: true,
        })) {
          files.delete(file)
        }
      }
    }

    // Apply maxDepth if specified
    if (typeof maxDepth === 'number') {
      return Array.from(files).filter((file) => {
        const rel = relative(path, file)
        const segments = rel.split('/').filter(Boolean)
        return segments.length <= maxDepth
      })
    }

    return Array.from(files)
  }
  catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to get files: ${errorMessage}`)
  }
}

export async function watchFiles(
  path: string,
  patterns: string[],
  callback: (file: string) => void,
  options: GetFilesOptions = {},
): Promise<() => void> {
  const files = await getFiles(path, {
    ...options,
    patterns,
  })

  // Since Bun doesn't have a stable watch API yet,
  // we'll return a simple cleanup function
  const abortController = new AbortController()

  // Log that we would watch these files
  for (const file of files) {
    debugLog('watch', `Would watch file: ${file}`, true)
  }

  // Return cleanup function
  return () => abortController.abort()
}

export function isPathMatching(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const glob = new Bun.Glob(pattern)
    return glob.match(path)
  })
}

export function filterPaths(paths: string[], include: string[], exclude: string[] = []): string[] {
  return paths.filter(path =>
    include.some(pattern => new Bun.Glob(pattern).match(path))
    && !exclude.some(pattern => new Bun.Glob(pattern).match(path)),
  )
}

export function debugLog(category: string, message: string, verbose?: boolean | string[]): void {
  if (verbose === false) {
    return
  }

  if (verbose === true || config.verbose === true) {
    // eslint-disable-next-line no-console
    console.debug(`[imgx:${category}] ${message}`)
  }

  if (Array.isArray(verbose)) {
    // Check if any of the verbose categories match the prefix
    const matches = verbose.some(prefix => category.startsWith(prefix))
    if (matches) {
      // eslint-disable-next-line no-console
      console.log(`[imgx:${category}] ${message}`)
    }
  }

  if (Array.isArray(config.verbose)) {
    // Check if any of the verbose categories match the prefix
    const matches = config.verbose.some(prefix => category.startsWith(prefix))
    if (matches) {
      // eslint-disable-next-line no-console
      console.log(`[imgx:${category}] ${message}`)
    }
  }
}

export function parseFileSize(size: string): number {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  }

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/)
  if (!match)
    throw new Error(`Invalid file size format: ${size}`)

  const [, num, unit] = match
  return Number.parseFloat(num) * units[unit as keyof typeof units]
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

export function printSummary(results: Array<OptimizeResult | null>): void {
  const successful = results.filter(Boolean) as OptimizeResult[]
  const failed = results.filter(r => r?.error)

  if (successful.length > 0) {
    const totalInputSize = successful.reduce((sum, r) => sum + r.inputSize, 0)
    const totalOutputSize = successful.reduce((sum, r) => sum + r.outputSize, 0)
    const totalSaved = totalInputSize - totalOutputSize
    const totalPercentage = (totalSaved / totalInputSize) * 100

    // eslint-disable-next-line no-console
    console.log(`
      Successfully processed ${successful.length} files:
      - Total input size: ${formatBytes(totalInputSize)}
      - Total output size: ${formatBytes(totalOutputSize)}
      - Total saved: ${formatBytes(totalSaved)} (${totalPercentage.toFixed(2)}%)
    `)
  }

  if (failed.length > 0) {
    console.error(`\nFailed to process ${failed.length} files:`)
    failed.forEach((result) => {
      console.error(`- ${result?.inputPath}: ${result?.error?.message}`)
    })
  }
}
