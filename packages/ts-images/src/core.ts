import type { OptimizeResult, ProcessOptions } from './types'
import { extname } from 'node:path'
import { processImage, processSvg } from './processor'
import { debugLog } from './utils'

// Re-export all image processing primitives from core/
export * from './core/index'

const SVG_EXTENSIONS = new Set(['.svg'])
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

export async function process(options: ProcessOptions): Promise<OptimizeResult> {
  const { input } = options

  if (typeof input === 'string') {
    const ext = extname(input).toLowerCase()
    const isSvg = SVG_EXTENSIONS.has(ext)
    const isImage = IMAGE_EXTENSIONS.has(ext)

    if (!isSvg && !isImage) {
      throw new Error(`Unsupported file extension: ${ext}`)
    }

    debugLog('process', `Processing ${isSvg ? 'SVG' : 'image'}: ${input}`)
    return isSvg ? processSvg(options) : processImage(options)
  }

  // If input is a buffer, try to detect the file type
  const isSvg = options.isSvg ?? false
  return isSvg ? processSvg(options) : processImage(options)
}

export async function processMultiple(
  files: string[],
  options: Omit<ProcessOptions, 'input' | 'output'>,
): Promise<OptimizeResult[]> {
  debugLog('process', `Processing ${files.length} files`)

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        return await process({
          ...options,
          input: file,
          output: file, // Overwrite original file
        })
      }
      catch (error) {
        debugLog('error', `Failed to process ${file}: ${error.message}`)
        return {
          inputPath: file,
          outputPath: file,
          inputSize: 0,
          outputSize: 0,
          saved: 0,
          savedPercentage: 0,
          error,
        }
      }
    }),
  )

  const successful = results.filter(r => !r.error)
  const failed = results.filter(r => r.error)

  const totalSaved = successful.reduce((sum, r) => sum + r.saved, 0)
  const totalPercentage = (totalSaved / successful.reduce((sum, r) => sum + r.inputSize, 0)) * 100

  debugLog('process', `
    Processed ${results.length} files:
    - Successful: ${successful.length}
    - Failed: ${failed.length}
    - Total saved: ${totalSaved} bytes (${totalPercentage.toFixed(2)}%)
  `)

  return results
}
