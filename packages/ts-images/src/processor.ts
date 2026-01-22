import type {
  BatchProcessingOptions,
  BatchProcessingResult,
  ConversionOptions,
  ConversionResult,
  OptimizeResult,
  PlaceholderOptions,
  PlaceholderResult,
  ProcessOptions,
  SvgOptimizeOptions,
  SvgOptimizeResult,
  WatermarkOptions,
  WatermarkResult,
} from './types'
import { Buffer } from 'node:buffer'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { optimize } from 'svgo'
import { config } from './config'
import {
  blur,
  composite,
  createImageData,
  flip,
  flop,
  getDominantColor,
  grayscale,
  modulate,
  resize,
  rotate,
  sharpen,
  threshold,
} from './core'
import type { ImageData } from './core'
import { decode, encode, detectFormat, getMetadata } from './codecs'
import { generateThumbHash } from './thumbhash'
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

/**
 * Read an image file and decode it to ImageData
 */
async function readImage(input: string | Buffer): Promise<{ imageData: ImageData, originalSize: number }> {
  let inputBuffer: Uint8Array
  let originalSize: number

  if (typeof input === 'string') {
    inputBuffer = await readFile(input)
    const stats = await stat(input)
    originalSize = stats.size
  }
  else {
    inputBuffer = new Uint8Array(input)
    originalSize = input.length
  }

  const imageData = await decode(inputBuffer)
  return { imageData, originalSize }
}

/**
 * Encode ImageData and optionally write to file
 */
async function writeImage(
  imageData: ImageData,
  format: string,
  output?: string,
  options: { quality?: number, progressive?: boolean, lossless?: boolean, effort?: number } = {},
): Promise<Uint8Array> {
  const outputBuffer = await encode(imageData, format, options)

  if (output) {
    await ensureDir(output)
    await writeFile(output, outputBuffer)
  }

  return outputBuffer
}

export async function processImage(options: ProcessOptions): Promise<OptimizeResult> {
  const { input, output, quality = 80, resize: resizeOpt, format, progressive = true } = options

  debugLog('process', `Processing image with options: ${JSON.stringify(options)}`)

  try {
    const { imageData, originalSize } = await readImage(input)
    let processedData = imageData

    if (resizeOpt) {
      const dimensions = parseResize(resizeOpt)
      if (dimensions) {
        processedData = resize(processedData, {
          width: dimensions.width,
          height: dimensions.height,
        })
      }
    }

    const outputFormat = format || detectFormat(
      typeof input === 'string' ? await readFile(input) : new Uint8Array(input),
    ) || 'png'

    const outputBuffer = await writeImage(processedData, outputFormat, output, { quality, progressive })
    const outputSize = outputBuffer.length
    const saved = originalSize - outputSize
    const savedPercentage = (saved / originalSize) * 100

    debugLog('process', `Processed image: saved ${savedPercentage.toFixed(2)}% (${saved} bytes)`)

    return {
      inputPath: typeof input === 'string' ? input : 'buffer',
      outputPath: output || 'buffer',
      inputSize: originalSize,
      outputSize,
      saved,
      savedPercentage,
    }
  }
  catch (error: unknown) {
    debugLog('error', `Failed to process image: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/**
 * Process and optimize SVG files
 *
 * @param options Processing options
 * @returns Result of the optimization
 */
export async function processSvg(options: ProcessOptions): Promise<OptimizeResult> {
  const {
    input,
    output,
    prettify = false,
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
  catch (err) {
    // Properly handle the error with type safety
    const error = err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : 'Unknown error processing SVG')

    debugLog('error', `Failed to process SVG: ${error.message}`)
    throw error
  }
}

/**
 * Enhanced SVG optimization with advanced options
 *
 * @param input Path to the input SVG or SVG content as string/buffer
 * @param options SVG optimization options
 * @returns Result of the optimization
 */
export async function optimizeSvg(
  input: string | Buffer,
  options: SvgOptimizeOptions = {},
): Promise<SvgOptimizeResult> {
  const {
    output,
    prettify = config.svg?.prettify || false,
    precision = config.svg?.precision || 3,
    multipass = config.svg?.multipass || false,
    removeComments = config.svg?.removeComments || true,
    removeMetadata = config.svg?.removeMetadata || true,
    removeViewBox = config.svg?.removeViewBox || false,
    removeDimensions = config.svg?.removeDimensions || true,
    removeHiddenElements = config.svg?.removeHiddenElements || true,
    removeEmptyAttrs = config.svg?.removeEmptyAttrs || true,
    removeEmptyContainers = config.svg?.removeEmptyContainers || true,
    removeUnusedNS = config.svg?.removeUnusedNS || true,
    cleanupIDs = config.svg?.cleanupIDs || true,
    cleanupNumericValues = config.svg?.cleanupNumericValues || true,
    cleanupListOfValues = config.svg?.cleanupListOfValues || true,
    collapseGroups = config.svg?.collapseGroups || true,
    convertColors = config.svg?.convertColors || true,
    convertPathData = config.svg?.convertPathData || true,
    convertShapeToPath = config.svg?.convertShapeToPath || true,
    convertStyleToAttrs = config.svg?.convertStyleToAttrs || true,
    convertTransform = config.svg?.convertTransform || true,
    inlineStyles = config.svg?.inlineStyles || true,
    minifyStyles = config.svg?.minifyStyles || true,
    mergePaths = config.svg?.mergePaths || true,
    prefixIds = config.svg?.prefixIds || false,
    prefixClassNames = config.svg?.prefixClassNames || false,
    removeXMLNS = config.svg?.removeXMLNS || false,
    removeOffCanvasPaths = config.svg?.removeOffCanvasPaths || false,
    reusePaths = config.svg?.reusePaths || false,
    sortAttrs = config.svg?.sortAttrs || true,
    sortDefsChildren = config.svg?.sortDefsChildren || true,
    removeDoctype = config.svg?.removeDoctype || true,
    removeXMLProcInst = config.svg?.removeXMLProcInst || true,
    removeTitle = config.svg?.removeTitle || false,
    removeDesc = config.svg?.removeDesc || false,
    removeScriptElement = config.svg?.removeScriptElement || false,
    removeStyleElement = config.svg?.removeStyleElement || false,
    stats = false,
  } = options

  debugLog('processor', `Optimizing SVG with ${multipass ? 'multipass' : 'single pass'} mode`)

  try {
    // Get the SVG content
    let inputContent: string
    const inputPath: string = typeof input === 'string' && !input.trim().startsWith('<') ? input : 'buffer'
    let inputSize: number

    if (typeof input === 'string') {
      if (input.trim().startsWith('<')) {
        // Input is SVG string content
        inputContent = input
        inputSize = Buffer.from(input).length
      }
      else {
        // Input is a file path
        inputContent = await readFile(input, 'utf-8')
        const stats = await stat(input)
        inputSize = stats.size
      }
    }
    else {
      // Input is a buffer
      inputContent = input.toString('utf-8')
      inputSize = input.length
    }

    // Create SVGO configuration
    const svgoConfig = {
      multipass,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              // Configure preset-default options
              removeViewBox,
              removeComments,
              removeMetadata,
              removeDoctype,
              removeXMLProcInst,
              removeTitle,
              removeDesc,
              convertPathData,
              convertTransform,
              inlineStyles,
              mergePaths,
              minifyStyles,
              cleanupNumericValues,
              collapseGroups,
              convertColors,
              removeEmptyAttrs,
              removeEmptyContainers,
              removeUnusedNS,
              sortAttrs,
              sortDefsChildren,
            },
          },
        },
      ] as any, // Type assertion needed for SVGO's complex plugin config
      js2svg: {
        pretty: prettify,
        indent: 2,
        precision,
      },
    }

    // For non-preset-default plugins, we add them separately
    // Note: SVGO expects proper plugin objects/configs, not just names
    if (cleanupIDs) {
      svgoConfig.plugins.push({ name: 'cleanupIds' })
    }

    if (cleanupListOfValues) {
      svgoConfig.plugins.push({ name: 'cleanupListOfValues' })
    }

    if (convertShapeToPath) {
      svgoConfig.plugins.push({ name: 'convertShapeToPath' })
    }

    if (convertStyleToAttrs) {
      svgoConfig.plugins.push({ name: 'convertStyleToAttrs' })
    }

    if (removeHiddenElements) {
      svgoConfig.plugins.push({ name: 'removeHiddenElems' })
    }

    if (removeDimensions) {
      svgoConfig.plugins.push({ name: 'removeDimensions' })
    }

    if (prefixIds) {
      svgoConfig.plugins.push({
        name: 'prefixIds',
        params: {
          prefix: typeof prefixIds === 'string' ? prefixIds : 'id-',
          delim: '-',
        },
      })
    }

    if (prefixClassNames) {
      svgoConfig.plugins.push({
        name: 'prefixClassNames',
        params: {
          prefix: typeof prefixClassNames === 'string' ? prefixClassNames : 'class-',
          delim: '-',
        },
      })
    }

    if (removeXMLNS) {
      svgoConfig.plugins.push({ name: 'removeXMLNS' })
    }

    if (reusePaths) {
      svgoConfig.plugins.push({ name: 'reusePaths' })
    }

    if (removeOffCanvasPaths) {
      svgoConfig.plugins.push({ name: 'removeOffCanvasPaths' })
    }

    if (removeScriptElement) {
      svgoConfig.plugins.push({ name: 'removeScriptElems' })
    }

    if (removeStyleElement) {
      svgoConfig.plugins.push({ name: 'removeStyleElems' })
    }

    // Run the optimization
    const result = optimize(inputContent, svgoConfig as any)
    const outputContent = result.data

    // Calculate statistics
    const outputSize = Buffer.from(outputContent).length
    const saved = inputSize - outputSize
    const savedPercentage = (saved / inputSize) * 100

    // Get optimization details
    const optimizationInfo = stats ? {} : null // SVGO 2+ doesn't provide detailed info

    // Write output to file if requested
    let outputPath = output
    if (outputPath) {
      await ensureDir(outputPath)
      await writeFile(outputPath, outputContent)
    }
    else if (typeof input === 'string' && !input.trim().startsWith('<')) {
      // Default output path based on input file
      const inputExt = extname(input)
      outputPath = input.replace(
        new RegExp(`${inputExt}$`),
        `.optimized${inputExt}`,
      )
      await ensureDir(outputPath)
      await writeFile(outputPath, outputContent)
    }
    else {
      outputPath = 'buffer'
    }

    debugLog('processor', `Optimized SVG: saved ${savedPercentage.toFixed(2)}% (${saved} bytes)`)

    return {
      inputPath,
      outputPath,
      inputSize,
      outputSize,
      saved,
      savedPercentage,
      content: outputContent,
      prettified: prettify,
      multipass,
      stats: optimizationInfo,
    }
  }
  catch (err) {
    const error = err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : 'Unknown error optimizing SVG')

    debugLog('error', `Failed to optimize SVG: ${error.message}`)
    throw error
  }
}

/**
 * Convert any image to SVG with tracing
 *
 * @param input Path to the input image or Buffer
 * @param options Conversion options
 * @param options.output Path to save the output SVG file
 * @param options.mode Tracing mode: 'color', 'grayscale', 'bw', or 'posterized'
 * @param options.background Background color for the SVG
 * @param options.colorCount Number of colors to use in color tracing mode
 * @param options.steps Number of steps for posterized mode
 * @param options.threshold Brightness threshold value (0-255) for black and white mode
 * @param options.tolerance Tolerance for path optimization (higher = smoother paths)
 * @param options.optionsSvg Additional SVG optimization options
 * @returns Path to the output SVG and metadata
 */
export async function imageToSvg(
  input: string | Buffer,
  options: {
    output?: string
    mode?: 'color' | 'grayscale' | 'bw' | 'posterized'
    background?: string
    colorCount?: number
    steps?: number
    threshold?: number
    tolerance?: number
    optionsSvg?: SvgOptimizeOptions
  } = {},
): Promise<{
    inputPath: string
    outputPath: string
    svgContent: string
    dimensions: { width: number, height: number }
  }> {
  const {
    output,
    mode = 'color',
    background,
    colorCount = 16,
    steps = 4,
    threshold: thresholdLevel = 128,
    tolerance = 3,
    optionsSvg = {},
  } = options

  debugLog('processor', `Converting image to SVG using ${mode} mode`)

  try {
    // Process input
    const { imageData } = await readImage(input)
    const inputPath = typeof input === 'string' ? input : 'buffer'

    const width = imageData.width
    const height = imageData.height

    // Import potrace dynamically to handle environments where it might not be available
    let potrace: any
    try {
      potrace = await import('ts-potrace')
    }
    catch {
      throw new Error('Potrace library is required for image to SVG conversion. Please install it with: bun install ts-potrace')
    }

    // Process the image based on the mode
    let processedData = imageData

    if (mode === 'bw') {
      // Convert to grayscale then threshold for black and white
      processedData = grayscale(processedData)
      processedData = threshold(processedData, thresholdLevel)
    }
    else if (mode === 'grayscale') {
      // Convert to grayscale
      processedData = grayscale(processedData)
    }
    else if (mode === 'posterized') {
      // For posterized, we reduce to a limited number of levels
      // This is a simple posterization by quantizing color values
      const levelStep = Math.floor(256 / steps)
      const posterized = createImageData(width, height)
      for (let i = 0; i < processedData.data.length; i += 4) {
        posterized.data[i] = Math.floor(processedData.data[i] / levelStep) * levelStep
        posterized.data[i + 1] = Math.floor(processedData.data[i + 1] / levelStep) * levelStep
        posterized.data[i + 2] = Math.floor(processedData.data[i + 2] / levelStep) * levelStep
        posterized.data[i + 3] = processedData.data[i + 3]
      }
      processedData = posterized
    }

    // Encode as PNG for potrace
    const processedBuffer = await encode(processedData, 'png')

    // Trace the image to SVG
    let svgContent: string

    if (mode === 'color' || mode === 'posterized') {
      // Use color tracing for color and posterized modes
      svgContent = await new Promise((resolve, reject) => {
        potrace.trace(Buffer.from(processedBuffer), {
          color: mode === 'color',
          optTolerance: tolerance,
          turdSize: 5, // Suppress speckles
          turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
          pathomit: 8, // Higher threshold for omitting paths
          colorQuantization: true,
          colorCount,
        }, (err: Error | null, svg: string) => {
          if (err)
            reject(err)
          else resolve(svg)
        })
      })
    }
    else {
      // Use standard tracing for bw and grayscale
      svgContent = await new Promise((resolve, reject) => {
        potrace.trace(Buffer.from(processedBuffer), {
          turdSize: 5,
          turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
          optTolerance: tolerance,
          optCurve: true,
          alphaMax: 1,
          threshold: thresholdLevel,
          blackOnWhite: true, // Set to false for white on black
        }, (err: Error | null, svg: string) => {
          if (err)
            reject(err)
          else resolve(svg)
        })
      })
    }

    // Add background if specified
    if (background) {
      const bgRect = `<rect width="100%" height="100%" fill="${background}"/>`
      const svgOpenTag = svgContent.indexOf('<svg')
      const svgAfterOpenTag = svgContent.indexOf('>', svgOpenTag) + 1
      svgContent = svgContent.slice(0, svgAfterOpenTag) + bgRect + svgContent.slice(svgAfterOpenTag)
    }

    // Optimize the SVG if requested
    if (Object.keys(optionsSvg).length > 0) {
      const optimizedSvg = await optimizeSvg(svgContent, optionsSvg)
      svgContent = optimizedSvg.content
    }

    // Save the result
    let outputPath = output
    if (outputPath) {
      await ensureDir(outputPath)
      await writeFile(outputPath, svgContent)
    }
    else if (typeof input === 'string') {
      // Default output path based on input file
      const inputExt = extname(input)
      outputPath = input.replace(
        new RegExp(`${inputExt}$`),
        '.svg',
      )
      await ensureDir(outputPath)
      await writeFile(outputPath, svgContent)
    }
    else {
      outputPath = 'buffer'
    }

    return {
      inputPath,
      outputPath,
      svgContent,
      dimensions: { width, height },
    }
  }
  catch (err) {
    const error = err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : 'Unknown error converting image to SVG')

    debugLog('error', `Failed to convert image to SVG: ${error.message}`)
    throw error
  }
}

/**
 * Generates a low-resolution placeholder for an image
 * This can be used to show a preview while the full image loads
 *
 * @param input Path to the input image
 * @param options Configuration options
 * @returns The placeholder data
 */
export async function generatePlaceholder(
  input: string,
  options: PlaceholderOptions = {},
): Promise<PlaceholderResult> {
  const {
    width = config.placeholders?.width || 20,
    height = config.placeholders?.height,
    quality = config.placeholders?.quality || 50,
    format = config.placeholders?.format || 'webp',
    blurLevel = config.placeholders?.blurLevel || 40,
    base64Encode = config.placeholders?.base64Encode !== undefined ? config.placeholders.base64Encode : true,
    thumbhash = config.placeholders?.useThumbhash || false,
    outputPath,
    strategy = thumbhash ? 'thumbhash' : 'blur',
    saturation = 1.2,
    cssFilter = false,
  } = options

  debugLog('processor', `Generating placeholder for ${input} using strategy: ${strategy}`)

  // Read and decode the image
  const { imageData } = await readImage(input)
  const originalWidth = imageData.width
  const originalHeight = imageData.height
  const aspectRatio = (originalWidth || 1) / (originalHeight || 1)

  // If using thumbhash, generate it
  if (strategy === 'thumbhash' || thumbhash) {
    const { dataUrl } = await generateThumbHash(input)

    return {
      dataURL: dataUrl,
      width: width || Math.round(height ? height * aspectRatio : originalWidth),
      height: height || Math.round(width ? width / aspectRatio : originalHeight),
      aspectRatio,
      originalWidth,
      originalHeight,
      strategy: 'thumbhash',
    }
  }

  // If using dominant color strategy
  if (strategy === 'dominant-color') {
    const dominantRgb = getDominantColor(imageData)
    const dominantColor = `rgb(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b})`

    return {
      dataURL: `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${originalWidth}' height='${originalHeight}' style='background-color:${dominantColor}'/%3E`,
      width: originalWidth,
      height: originalHeight,
      aspectRatio,
      originalWidth,
      originalHeight,
      strategy: 'dominant-color',
      dominantColor,
    }
  }

  // Otherwise, create a standard blurred or pixelated placeholder
  let processedImage = resize(imageData, {
    width,
    height,
    fit: 'inside',
  })

  if (strategy === 'blur') {
    // Convert blur level to sigma (approximately)
    const sigma = blurLevel / 10
    processedImage = blur(processedImage, sigma)
  }
  else if (strategy === 'pixelate') {
    // To pixelate, we resize small then resize back larger with nearest neighbor
    const pixelSize = Math.max(8, Math.floor(width / 8))
    const smallImage = resize(imageData, { width: pixelSize, fit: 'inside' })
    processedImage = resize(smallImage, { width, height, kernel: 'nearest' })
  }

  // Apply saturation adjustment if needed
  if (saturation !== 1.0) {
    processedImage = modulate(processedImage, { saturation })
  }

  let buffer: Uint8Array
  let finalPath: string

  if (base64Encode) {
    buffer = await encode(processedImage, format, { quality })
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`
    const dataURL = `data:${mimeType};base64,${base64}`

    const result = {
      dataURL,
      width: originalWidth,
      height: originalHeight,
      aspectRatio,
      originalWidth,
      originalHeight,
      strategy,
    }

    // Add CSS if requested
    if (cssFilter) {
      const css = `
.placeholder-image {
  background-size: cover;
  background-position: center;
  background-image: url(${dataURL});
  filter: blur(20px);
  transform: scale(1.1);
}`.trim()
      return { ...result, css }
    }

    return result
  }
  else {
    finalPath = outputPath || input.replace(/\.[^/.]+$/, `.placeholder.${format}`)
    await writeImage(processedImage, format, finalPath, { quality })

    return {
      dataURL: finalPath,
      width: originalWidth,
      height: originalHeight,
      aspectRatio,
      originalWidth,
      originalHeight,
      strategy,
    }
  }
}

/**
 * Converts images between formats
 *
 * @param input Path to the input image
 * @param outputFormat Format to convert to
 * @param options Configuration options
 * @returns Path to the converted image
 */
export async function convertImageFormat(
  input: string,
  outputFormat: 'webp' | 'avif' | 'jpeg' | 'png' | 'gif',
  options: ConversionOptions = {},
): Promise<ConversionResult> {
  const {
    outputDir,
    quality = config.conversion?.quality || 80,
    lossless = config.conversion?.lossless || false,
    progressive = config.conversion?.progressive !== undefined ? config.conversion.progressive : true,
    filenamePrefix = '',
    filenameSuffix = '',
    resize: resizeOptions,
    preserveMetadata = false,
    effort = 6,
  } = options

  debugLog('processor', `Converting ${input} to ${outputFormat}`)

  // Get information about the input file
  const originalStats = await stat(input)
  const originalSize = originalStats.size

  const inputExt = extname(input)
  const inputBasename = input.slice(0, -inputExt.length)
  const inputFilename = inputBasename.split('/').pop() || 'image'

  // Create output path
  const outputFilename = `${filenamePrefix}${inputFilename}${filenameSuffix}.${outputFormat}`
  const outputPath = outputDir
    ? join(outputDir, outputFilename)
    : `${inputBasename}.${outputFormat}`

  // Ensure output directory exists
  if (outputDir) {
    await ensureDir(outputPath)
  }

  // Read and decode the image
  const { imageData } = await readImage(input)
  let processedImage = imageData

  // Apply resizing if specified
  if (resizeOptions) {
    processedImage = resize(processedImage, {
      width: resizeOptions.width,
      height: resizeOptions.height,
      fit: resizeOptions.fit as any || 'contain',
    })
  }

  // Encode to the target format
  await writeImage(processedImage, outputFormat, outputPath, {
    quality,
    lossless,
    progressive,
    effort,
  })

  // Get output file size
  const outputStats = await stat(outputPath)
  const convertedSize = outputStats.size

  // Calculate savings
  const saved = originalSize - convertedSize
  const savedPercentage = (saved / originalSize) * 100

  return {
    inputPath: input,
    outputPath,
    format: outputFormat,
    width: processedImage.width,
    height: processedImage.height,
    originalSize,
    convertedSize,
    saved,
    savedPercentage,
  }
}

/**
 * Processes all images in a directory
 *
 * @param inputDir Directory containing images to process
 * @param options Configuration options
 * @returns Results of the processing
 */
export async function batchProcessImages(
  inputDir: string,
  options: BatchProcessingOptions = {},
): Promise<BatchProcessingResult> {
  const {
    outputDir = inputDir,
    formats = config.batch?.formats || ['webp'],
    quality = config.batch?.quality || 80,
    resize: resizeOptions = config.batch?.resize,
    recursive = config.batch?.recursive || false,
    filter = config.batch?.filter ? new RegExp(config.batch.filter, 'i') : /\.(jpe?g|png|gif|bmp|tiff?)$/i,
    skipExisting = config.batch?.skipExisting !== undefined ? config.batch.skipExisting : true,
    concurrency = config.concurrent || 4,
    preserveStructure = true,
    filenameTemplate = '[name].[format]',
    preserveMetadata = false,
    optimizationPreset = 'web',
    transformations = [],
    progressCallback,
  } = options

  debugLog('processor', `Batch processing images in ${inputDir}`)

  const results: Array<{
    input: string
    outputs: Array<{
      path: string
      format: string
      size: number
      saved: number
    }>
    success: boolean
    error?: string
  }> = []

  // Summary statistics
  const summary = {
    totalFiles: 0,
    successCount: 0,
    errorCount: 0,
    originalSize: 0,
    optimizedSize: 0,
    saved: 0,
    savedPercentage: 0,
    timeElapsed: 0,
  }

  const startTime = Date.now()
  const pendingFiles: string[] = []

  // Map to track images being processed to prevent parallel processing of the same file
  const processingTracker = new Map<string, boolean>()

  // Function to get format-specific quality settings
  const getQuality = (format: string): number => {
    if (typeof quality === 'number')
      return quality

    if (quality[format])
      return quality[format]

    // Default quality settings based on format
    switch (format) {
      case 'webp': return 80
      case 'avif': return 70
      case 'jpeg': return 85
      case 'png': return 90
      default: return 80
    }
  }

  // Apply optimization preset
  const getFormatOptions = (format: string, originalSize: number): Record<string, any> => {
    const baseQuality = getQuality(format)

    switch (optimizationPreset) {
      case 'web':
        return {
          quality: baseQuality,
          effort: 6,
          lossless: false,
          progressive: format === 'jpeg' || format === 'png',
        }
      case 'quality':
        return {
          quality: Math.min(baseQuality + 10, 100),
          effort: 9,
          lossless: format === 'png' || originalSize < 100 * 1024, // Use lossless for small files
          progressive: format === 'jpeg' || format === 'png',
        }
      case 'performance':
        return {
          quality: Math.max(baseQuality - 10, 60),
          effort: 3,
          lossless: false,
          progressive: false,
        }
      default:
        return {
          quality: baseQuality,
        }
    }
  }

  // Create a function to apply transformations to an image
  const applyTransformations = (image: ImageData): ImageData => {
    let processedImage = image

    for (const transform of transformations) {
      switch (transform.type) {
        case 'resize':
          processedImage = resize(processedImage, transform.options)
          break
        case 'rotate':
          processedImage = rotate(processedImage, transform.options?.angle || 0, transform.options)
          break
        case 'flip':
          processedImage = flip(processedImage)
          break
        case 'flop':
          processedImage = flop(processedImage)
          break
        case 'blur':
          processedImage = blur(processedImage, transform.options?.sigma || 1)
          break
        case 'sharpen':
          processedImage = sharpen(processedImage, transform.options)
          break
        case 'grayscale':
          processedImage = grayscale(processedImage)
          break
      }
    }

    return processedImage
  }

  async function processDirectory(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = join(dir, entry.name)

      if (entry.isDirectory() && recursive) {
        await processDirectory(entryPath)
        continue
      }

      if (!entry.isFile() || !filter.test(entry.name)) {
        continue
      }

      pendingFiles.push(entryPath)
      summary.totalFiles++
    }
  }

  // Function to process a single file
  async function processFile(filePath: string): Promise<void> {
    // Skip if already processing
    if (processingTracker.get(filePath))
      return

    processingTracker.set(filePath, true)

    try {
      const outputs: Array<{ path: string, format: string, size: number, saved: number }> = []
      const relativePath = filePath.replace(inputDir, '').replace(/^\//, '')

      // Create the output directory structure if preserving structure
      let targetDir = outputDir
      if (preserveStructure) {
        const relativeDir = dirname(relativePath)
        if (relativeDir !== '.') {
          targetDir = join(outputDir, relativeDir)
          await mkdir(targetDir, { recursive: true })
        }
      }

      const filename = filePath.split('/').pop() || 'image'
      const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '')

      // Get stats for original file
      const originalStats = await stat(filePath)
      summary.originalSize += originalStats.size

      // Read and decode image
      const { imageData } = await readImage(filePath)

      for (const format of formats) {
        // Create output filename from template
        const outputFilename = filenameTemplate
          .replace(/\[name\]/g, filenameWithoutExt)
          .replace(/\[format\]/g, format)
          .replace(/\[width\]/g, imageData.width.toString())
          .replace(/\[height\]/g, imageData.height.toString())
          .replace(/\[quality\]/g, getQuality(format).toString())

        const outputFilePath = join(targetDir, outputFilename)

        // Skip if the output file exists and skipExisting is true
        if (skipExisting) {
          try {
            await stat(outputFilePath)
            const outputStats = await stat(outputFilePath)
            outputs.push({
              path: outputFilePath,
              format,
              size: outputStats.size,
              saved: originalStats.size - outputStats.size,
            })
            continue
          }
          catch {
            // File doesn't exist, continue with processing
          }
        }

        // Get format-specific options based on preset
        const formatOptions = getFormatOptions(format, originalStats.size)

        // Apply general transformations
        let transformedImage = applyTransformations(imageData)

        // Apply resize if specified
        if (resizeOptions) {
          transformedImage = resize(transformedImage, {
            width: resizeOptions.width,
            height: resizeOptions.height,
          })
        }

        // Encode and write
        await writeImage(transformedImage, format, outputFilePath, formatOptions)

        // Get the output file size
        const outputStats = await stat(outputFilePath)
        const savedBytes = originalStats.size - outputStats.size

        outputs.push({
          path: outputFilePath,
          format,
          size: outputStats.size,
          saved: savedBytes,
        })

        summary.optimizedSize += outputStats.size
        summary.saved += savedBytes
      }

      const result = {
        input: filePath,
        outputs,
        success: true,
      }

      results.push(result)
      summary.successCount++

      // Call progress callback if provided
      if (progressCallback) {
        progressCallback({
          completed: summary.successCount + summary.errorCount,
          total: summary.totalFiles,
          percentage: ((summary.successCount + summary.errorCount) / summary.totalFiles) * 100,
          currentFile: filePath,
          success: true,
        })
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      results.push({
        input: filePath,
        outputs: [],
        success: false,
        error: errorMessage,
      })

      summary.errorCount++

      // Call progress callback if provided
      if (progressCallback) {
        progressCallback({
          completed: summary.successCount + summary.errorCount,
          total: summary.totalFiles,
          percentage: ((summary.successCount + summary.errorCount) / summary.totalFiles) * 100,
          currentFile: filePath,
          success: false,
        })
      }
    }

    processingTracker.delete(filePath)
  }

  await processDirectory(inputDir)

  // Process files with concurrency control
  while (pendingFiles.length > 0) {
    const batch = pendingFiles.splice(0, Math.min(concurrency, pendingFiles.length))
    await Promise.all(batch.map(file => processFile(file)))
  }

  // Calculate final summary values
  const endTime = Date.now()
  summary.timeElapsed = endTime - startTime

  if (summary.originalSize > 0) {
    summary.savedPercentage = (summary.saved / summary.originalSize) * 100
  }

  return {
    summary,
    results,
  }
}

/**
 * Optimizes an image using best practices for the format
 *
 * @param input Path to the input image
 * @param output Path to save the optimized image
 * @param options Optional configuration options
 * @param options.quality Compression quality (1-100)
 * @param options.lossless Whether to use lossless compression
 * @param options.progressive Enable progressive encoding
 * @param options.effort Compression effort level (1-10)
 * @param options.metadata Preserve image metadata
 * @returns Result of the optimization
 */
export async function optimizeImage(
  input: string,
  output: string,
  options: {
    quality?: number
    lossless?: boolean
    progressive?: boolean
    effort?: number
    metadata?: boolean
  } = {},
): Promise<{
    originalSize: number
    optimizedSize: number
    saved: number
    savedPercentage: number
    success: boolean
    outputPath: string
  }> {
  const {
    quality = config.optimization?.quality || 80,
    lossless = config.optimization?.lossless || false,
    progressive = config.optimization?.progressive !== undefined ? config.optimization.progressive : true,
    effort = config.optimization?.effort || 7,
    metadata = config.optimization?.preserveMetadata || false,
  } = options

  debugLog('processor', `Optimizing image: ${input}`)

  try {
    // Get the original file size
    const inputStats = await stat(input)
    const originalSize = inputStats.size

    // Read and decode the image
    const inputBuffer = await readFile(input)
    const format = detectFormat(inputBuffer) || 'png'
    const { imageData } = await readImage(input)

    // Get format-specific quality from config if available
    let outputQuality = quality
    switch (format) {
      case 'jpeg':
        outputQuality = options.quality || config.optimization?.jpeg?.quality || quality
        break
      case 'png':
        outputQuality = options.quality || config.optimization?.png?.quality || quality
        break
      case 'webp':
        outputQuality = options.quality || config.optimization?.webp?.quality || quality
        break
      case 'avif':
        outputQuality = options.quality || config.optimization?.avif?.quality || quality
        break
    }

    // Encode to the same format with optimization settings
    await writeImage(imageData, format, output, {
      quality: outputQuality,
      lossless,
      progressive,
      effort,
    })

    // Get the optimized file size
    const outputStats = await stat(output)
    let optimizedSize = outputStats.size

    // If the "optimized" output is larger than the original, use the original instead
    if (optimizedSize >= originalSize) {
      // Copy original file to output location
      await writeFile(output, inputBuffer)
      optimizedSize = originalSize
      debugLog('processor', `Optimization complete: saved 0.00% (0 bytes) - original was already optimal`)

      return {
        originalSize,
        optimizedSize: originalSize,
        saved: 0,
        savedPercentage: 0,
        success: true,
        outputPath: output,
      }
    }

    const saved = originalSize - optimizedSize
    const savedPercentage = (saved / originalSize) * 100

    debugLog('processor', `Optimization complete: saved ${savedPercentage.toFixed(2)}% (${saved} bytes)`)

    return {
      originalSize,
      optimizedSize,
      saved,
      savedPercentage,
      success: true,
      outputPath: output,
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    debugLog('error', `Failed to optimize image: ${errorMessage}`)

    return {
      originalSize: 0,
      optimizedSize: 0,
      saved: 0,
      savedPercentage: 0,
      success: false,
      outputPath: output,
    }
  }
}

/**
 * Applies a watermark to an image
 * Supports both text watermarks and image watermarks
 *
 * @param input Path to the input image or Buffer
 * @param options Watermark configuration options
 * @returns Result containing the path to the watermarked image and stats
 */
export async function applyWatermark(
  input: string | Buffer,
  options: WatermarkOptions = {},
): Promise<WatermarkResult> {
  const {
    output,
    text,
    image,
    position = config.watermark?.position || 'bottom-right',
    margin = config.watermark?.margin || 20,
    opacity = config.watermark?.opacity || 0.5,
    scale = config.watermark?.scale || 0.2,
    rotate: rotateAngle = 0,
    tiled = false,
    textOptions = {},
  } = options

  if (!text && !image) {
    throw new Error('Either text or image must be provided for watermarking')
  }

  // Set watermark type
  const watermarkType = text ? 'text' : 'image'
  debugLog('processor', `Applying ${watermarkType} watermark to ${typeof input === 'string' ? input : 'buffer'}`)

  // Read the main image
  const { imageData } = await readImage(input)
  const inputPath = typeof input === 'string' ? input : 'buffer'
  const inputWidth = imageData.width
  const inputHeight = imageData.height

  // Calculate watermark placement coordinates
  const getPosition = (watermarkWidth: number, watermarkHeight: number) => {
    const positions: Record<string, { left: number, top: number }> = {
      'center': {
        left: Math.floor((inputWidth - watermarkWidth) / 2),
        top: Math.floor((inputHeight - watermarkHeight) / 2),
      },
      'top': {
        left: Math.floor((inputWidth - watermarkWidth) / 2),
        top: margin,
      },
      'bottom': {
        left: Math.floor((inputWidth - watermarkWidth) / 2),
        top: inputHeight - watermarkHeight - margin,
      },
      'left': {
        left: margin,
        top: Math.floor((inputHeight - watermarkHeight) / 2),
      },
      'right': {
        left: inputWidth - watermarkWidth - margin,
        top: Math.floor((inputHeight - watermarkHeight) / 2),
      },
      'top-left': {
        left: margin,
        top: margin,
      },
      'top-right': {
        left: inputWidth - watermarkWidth - margin,
        top: margin,
      },
      'bottom-left': {
        left: margin,
        top: inputHeight - watermarkHeight - margin,
      },
      'bottom-right': {
        left: inputWidth - watermarkWidth - margin,
        top: inputHeight - watermarkHeight - margin,
      },
    }

    return positions[position] || positions['bottom-right']
  }

  let resultImage = imageData

  if (text) {
    // Text watermark - create a simple text overlay using a solid color rectangle for now
    // Full text rendering would require a font rendering library
    const defaultTextOptions = config.watermark?.textOptions || {}
    const {
      fontSize = defaultTextOptions.fontSize || 24,
      color = defaultTextOptions.color || 'rgba(255, 255, 255, 0.5)',
    } = textOptions

    // Parse color (simplified - assumes rgba format)
    const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    const r = colorMatch ? parseInt(colorMatch[1]) : 255
    const g = colorMatch ? parseInt(colorMatch[2]) : 255
    const b = colorMatch ? parseInt(colorMatch[3]) : 255
    const a = colorMatch && colorMatch[4] ? Math.floor(parseFloat(colorMatch[4]) * 255) : 128

    // Create a placeholder watermark (simple rectangle for now)
    const watermarkWidth = Math.min(Math.floor(inputWidth * 0.3), text.length * fontSize * 0.6)
    const watermarkHeight = fontSize + 20
    const watermarkData = createImageData(watermarkWidth, watermarkHeight, {
      fill: { r, g, b, a: Math.floor(a * opacity) },
    })

    const { left, top } = getPosition(watermarkWidth, watermarkHeight)

    // Composite the watermark onto the main image
    resultImage = composite(imageData, watermarkData, {
      left,
      top,
      blend: 'normal',
    })
  }
  else if (image) {
    // Image watermark
    const { imageData: watermarkImageData } = await readImage(image)

    // Scale the watermark
    const scaledWidth = Math.floor(inputWidth * scale)
    const scaledHeight = Math.floor(scaledWidth * (watermarkImageData.height / watermarkImageData.width))

    let scaledWatermark = resize(watermarkImageData, {
      width: scaledWidth,
      height: scaledHeight,
    })

    // Apply rotation if needed
    if (rotateAngle !== 0) {
      scaledWatermark = rotate(scaledWatermark, rotateAngle)
    }

    // Apply opacity
    if (opacity < 1) {
      const opacityValue = Math.floor(opacity * 255)
      for (let i = 3; i < scaledWatermark.data.length; i += 4) {
        scaledWatermark.data[i] = Math.floor(scaledWatermark.data[i] * opacity)
      }
    }

    const { left, top } = getPosition(scaledWatermark.width, scaledWatermark.height)

    if (tiled) {
      // Tile the watermark across the image
      let tiledImage = imageData
      for (let y = 0; y < inputHeight; y += scaledWatermark.height + margin * 2) {
        for (let x = 0; x < inputWidth; x += scaledWatermark.width + margin * 2) {
          tiledImage = composite(tiledImage, scaledWatermark, {
            left: x,
            top: y,
            blend: 'normal',
          })
        }
      }
      resultImage = tiledImage
    }
    else {
      resultImage = composite(imageData, scaledWatermark, {
        left,
        top,
        blend: 'normal',
      })
    }
  }

  // Save the result or return as buffer
  let outputPath = output

  if (outputPath) {
    await ensureDir(outputPath)
    const format = extname(outputPath).slice(1) || 'png'
    await writeImage(resultImage, format, outputPath)
  }
  else if (typeof input === 'string') {
    // Default output path based on input
    const inputExt = extname(input)
    outputPath = input.replace(
      new RegExp(`${inputExt}$`),
      `.watermarked${inputExt}`,
    )
    const format = inputExt.slice(1) || 'png'
    await writeImage(resultImage, format, outputPath)
  }
  else {
    outputPath = 'buffer'
  }

  return {
    inputPath,
    outputPath,
    watermarkType,
    dimensions: {
      width: inputWidth,
      height: inputHeight,
    },
  }
}
