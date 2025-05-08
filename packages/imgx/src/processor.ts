import type { OptimizeResult, ProcessOptions } from './types'
import { Buffer } from 'node:buffer'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import sharp from 'sharp'
import { optimize } from 'svgo'
import { debugLog } from './utils'

function parseResize(resize: string | { width?: number, height?: number }) {
  if (typeof resize === 'string') {
    const match = resize.match(/^(\d+)%$/)
    if (match) {
      const percentage = Number.parseInt(match[1], 10)
      return { width: percentage, height: percentage }
    }
    return null
  }
  return resize
}

async function ensureDir(filepath: string) {
  const dir = dirname(filepath)
  await mkdir(dir, { recursive: true })
}

export async function processImage(options: ProcessOptions): Promise<OptimizeResult> {
  const { input, output, quality = 80, resize, format, progressive = true } = options

  debugLog('process', `Processing image with options: ${JSON.stringify(options)}`)

  let inputBuffer: Buffer
  let inputSize: number

  try {
    if (typeof input === 'string') {
      inputBuffer = await readFile(input)
      const stats = await stat(input)
      inputSize = stats.size
    }
    else {
      inputBuffer = input
      inputSize = input.length
    }

    let pipeline = sharp(inputBuffer)

    if (resize) {
      const dimensions = parseResize(resize)
      if (dimensions) {
        pipeline = pipeline.resize(dimensions.width, dimensions.height)
      }
    }

    if (format) {
      pipeline = pipeline[format]({ quality, progressive })
    }

    const outputBuffer = await pipeline.toBuffer()

    if (output) {
      await ensureDir(output)
      await writeFile(output, outputBuffer)
    }

    const outputSize = outputBuffer.length
    const saved = inputSize - outputSize
    const savedPercentage = (saved / inputSize) * 100

    debugLog('process', `Processed image: saved ${savedPercentage.toFixed(2)}% (${saved} bytes)`)

    return {
      inputPath: typeof input === 'string' ? input : 'buffer',
      outputPath: output || 'buffer',
      inputSize,
      outputSize,
      saved,
      savedPercentage,
    }
  }
  catch (error) {
    debugLog('error', `Failed to process image: ${error.message}`)
    throw error
  }
}

export async function processSvg(options: ProcessOptions): Promise<OptimizeResult> {
  const {
    input,
    output,
    prettify = false,
    // We'll ignore these options for now since they aren't working properly with SVGO
    // removeComments = true,
    // removeDimensions = false,
    // removeViewBox = false,
  } = options

  debugLog('process', `Processing SVG with options: ${JSON.stringify(options)}`)

  try {
    let inputContent: string
    let inputSize: number

    if (typeof input === 'string') {
      inputContent = await readFile(input, 'utf-8')
      const stats = await stat(input)
      inputSize = stats.size
    }
    else {
      inputContent = input.toString('utf-8')
      inputSize = input.length
    }

    // Use a simple configuration with preset-default
    // We can enhance this in the future with proper plugin overrides
    const result = optimize(inputContent, {
      plugins: [
        'preset-default',
      ],
      js2svg: {
        pretty: prettify,
        indent: 2,
      },
    })

    const outputContent = result.data

    if (output) {
      await ensureDir(output)
      await writeFile(output, outputContent)
    }

    const outputSize = Buffer.from(outputContent).length
    const saved = inputSize - outputSize
    const savedPercentage = (saved / inputSize) * 100

    debugLog('process', `Processed SVG: saved ${savedPercentage.toFixed(2)}% (${saved} bytes)`)

    return {
      inputPath: typeof input === 'string' ? input : 'buffer',
      outputPath: output || 'buffer',
      inputSize,
      outputSize,
      saved,
      savedPercentage,
    }
  }
  catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    debugLog('error', `Failed to process SVG: ${errorMessage}`)
    throw error
  }
}
