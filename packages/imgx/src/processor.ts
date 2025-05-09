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
import sharp from 'sharp'
import { optimize } from 'svgo'
import { config } from './config'
import { generateThumbHash, rgbaToThumbHash, thumbHashToDataURL } from './thumbhash'
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
    threshold = 128,
    tolerance = 3,
    optionsSvg = {},
  } = options

  debugLog('processor', `Converting image to SVG using ${mode} mode`)

  try {
    // Process input
    let inputBuffer: Buffer
    let inputPath: string

    if (typeof input === 'string') {
      inputBuffer = await readFile(input)
      inputPath = input
    }
    else {
      inputBuffer = input
      inputPath = 'buffer'
    }

    // Import potrace dynamically to handle environments where it might not be available
    let potrace: any
    try {
      potrace = await import('potrace')
    }
    catch {
      throw new Error('Potrace library is required for image to SVG conversion. Please install it with: bun install potrace')
    }

    // Get image metadata for dimensions
    const metadata = await sharp(inputBuffer).metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0

    // Process the image based on the mode
    let processedBuffer: Buffer

    if (mode === 'bw') {
      // Convert to 1-bit bitmap for black and white
      processedBuffer = await sharp(inputBuffer)
        .grayscale()
        .threshold(threshold)
        .toBuffer()
    }
    else if (mode === 'grayscale') {
      // Convert to grayscale with levels
      processedBuffer = await sharp(inputBuffer)
        .grayscale()
        .toBuffer()
    }
    else if (mode === 'posterized') {
      // Posterize image (reduce colors) before tracing
      // Since sharp doesn't have a direct posterize method, we'll use quantization
      processedBuffer = await sharp(inputBuffer)
        .toColorspace('srgb')
        // Quantize colors to simulate posterization
        .toFormat('png', {
          colors: steps, // Number of colors in the palette
          dither: 0, // No dithering for cleaner tracing
        })
        .toBuffer()
    }
    else {
      // Color mode - just ensure it's in RGB format
      processedBuffer = await sharp(inputBuffer)
        .toColorspace('srgb')
        .toBuffer()
    }

    // Trace the image to SVG
    let svgContent: string

    if (mode === 'color' || mode === 'posterized') {
      // Use color tracing for color and posterized modes
      svgContent = await new Promise((resolve, reject) => {
        potrace.trace(processedBuffer, {
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
        potrace.trace(processedBuffer, {
          turdSize: 5,
          turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
          optTolerance: tolerance,
          optCurve: true,
          alphaMax: 1,
          threshold,
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

  // Get image metadata first
  const metadata = await sharp(input).metadata()
  const originalWidth = metadata.width || 0
  const originalHeight = metadata.height || 0
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
    const { dominant } = await sharp(input)
      .resize(10, 10, { fit: 'inside' })
      .stats()

    const r = dominant.r
    const g = dominant.g
    const b = dominant.b
    const dominantColor = `rgb(${r}, ${g}, ${b})`

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
  const image = sharp(input)

  const resizeOptions = {
    width,
    height,
    fit: 'inside' as const,
  }

  let processedImage = image.resize(resizeOptions)

  if (strategy === 'blur') {
    processedImage = processedImage.blur(blurLevel)
  }
  else if (strategy === 'pixelate') {
    // To pixelate, we resize small then resize back larger with nearest neighbor
    processedImage = sharp(await sharp(input)
      .resize(Math.max(8, Math.floor(width / 8)), null, { fit: 'inside' })
      .toBuffer())
      .resize(width, height, { fit: 'inside', kernel: 'nearest' })
  }

  // Apply saturation adjustment if needed
  if (saturation !== 1.0) {
    processedImage = processedImage.modulate({
      saturation,
    })
  }

  // Set output format
  processedImage = processedImage.toFormat(format, { quality })

  let buffer: Buffer
  let finalPath: string

  if (base64Encode) {
    buffer = await processedImage.toBuffer()
    const base64 = buffer.toString('base64')
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
    await processedImage.toFile(finalPath)

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
    resize,
    preserveMetadata = false,
    chromaSubsampling = '4:2:0',
    optimizationLevel = 6,
    effort = 6,
    smartSubsample = true,
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

  // Set up sharp instance
  let imageProcessor = sharp(input)

  // Get original metadata for return value
  const imageMetadata = await imageProcessor.metadata()

  // Apply resizing if specified
  if (resize) {
    // Use original dimensions if not specified
    const resizeOptions = {
      width: resize.width || imageMetadata.width,
      height: resize.height || imageMetadata.height,
      fit: resize.fit || 'contain',
    }
    imageProcessor = imageProcessor.resize(
      resizeOptions.width,
      resizeOptions.height,
      { fit: resizeOptions.fit as any },
    )
  }

  // Apply format-specific options
  switch (outputFormat) {
    case 'webp':
      imageProcessor = imageProcessor.webp({
        quality,
        lossless,
        effort,
        smartSubsample,
      })
      break

    case 'avif':
      imageProcessor = imageProcessor.avif({
        quality,
        lossless,
        effort,
      })
      break

    case 'jpeg':
      imageProcessor = imageProcessor.jpeg({
        quality,
        progressive,
        chromaSubsampling,
        optimizeScans: true,
        mozjpeg: true,
      })
      break

    case 'png':
      imageProcessor = imageProcessor.png({
        quality,
        progressive,
        compressionLevel: optimizationLevel,
        adaptiveFiltering: true,
        palette: quality < 100,
      })
      break

    case 'gif':
      imageProcessor = imageProcessor.gif({
        effort,
      })
      break
  }

  // Preserve metadata if requested
  if (preserveMetadata) {
    imageProcessor = imageProcessor.withMetadata()
  }

  // Process the image
  await imageProcessor.toFile(outputPath)

  // Get output file size
  const outputStats = await stat(outputPath)
  const convertedSize = outputStats.size

  // Calculate savings
  const saved = originalSize - convertedSize
  const savedPercentage = (saved / originalSize) * 100

  // Get dimensions from output file to get resized values
  const outputMetadata = await sharp(outputPath).metadata()

  return {
    inputPath: input,
    outputPath,
    format: outputFormat,
    width: outputMetadata.width || 0,
    height: outputMetadata.height || 0,
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
    resize = config.batch?.resize,
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
          chromaSubsampling: '4:2:0',
        }
      case 'quality':
        return {
          quality: Math.min(baseQuality + 10, 100),
          effort: 9,
          lossless: format === 'png' || originalSize < 100 * 1024, // Use lossless for small files
          progressive: format === 'jpeg' || format === 'png',
          chromaSubsampling: '4:4:4',
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

  // Create a function to apply transformations to a sharp instance
  const applyTransformations = (image: any): any => {
    let processedImage = image

    for (const transform of transformations) {
      switch (transform.type) {
        case 'resize':
          processedImage = processedImage.resize(transform.options)
          break
        case 'rotate':
          processedImage = processedImage.rotate(transform.options?.angle || 0, transform.options)
          break
        case 'flip':
          processedImage = processedImage.flip()
          break
        case 'flop':
          processedImage = processedImage.flop()
          break
        case 'blur':
          processedImage = processedImage.blur(transform.options?.sigma || 1)
          break
        case 'sharpen':
          processedImage = processedImage.sharpen(transform.options)
          break
        case 'grayscale':
          processedImage = processedImage.grayscale()
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

      // Get image metadata
      const imageMetadata = await sharp(filePath).metadata()

      for (const format of formats) {
        // Create output filename from template
        const outputFilename = filenameTemplate
          .replace(/\[name\]/g, filenameWithoutExt)
          .replace(/\[format\]/g, format)
          .replace(/\[width\]/g, (imageMetadata.width || 0).toString())
          .replace(/\[height\]/g, (imageMetadata.height || 0).toString())
          .replace(/\[quality\]/g, getQuality(format).toString())

        const outputPath = join(targetDir, outputFilename)

        // Skip if the output file exists and skipExisting is true
        if (skipExisting) {
          try {
            await stat(outputPath)
            const outputStats = await stat(outputPath)
            outputs.push({
              path: outputPath,
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

        // Process the image
        const processor = sharp(filePath)

        // Apply general transformations
        const transformedImage = applyTransformations(processor)

        // Apply resize if specified
        if (resize) {
          transformedImage.resize(resize.width, resize.height)
        }

        // Apply format-specific settings
        switch (format) {
          case 'webp':
            transformedImage.webp({
              quality: formatOptions.quality,
              lossless: formatOptions.lossless,
              effort: formatOptions.effort,
              smartSubsample: formatOptions.smartSubsample,
            })
            break
          case 'avif':
            transformedImage.avif({
              quality: formatOptions.quality,
              lossless: formatOptions.lossless,
              effort: formatOptions.effort,
            })
            break
          case 'jpeg':
            transformedImage.jpeg({
              quality: formatOptions.quality,
              progressive: formatOptions.progressive,
              chromaSubsampling: formatOptions.chromaSubsampling,
              mozjpeg: true,
            })
            break
          case 'png':
            transformedImage.png({
              quality: formatOptions.quality,
              progressive: formatOptions.progressive,
              compressionLevel: formatOptions.effort,
              adaptiveFiltering: true,
            })
            break
        }

        // Preserve metadata if requested
        if (preserveMetadata) {
          transformedImage.withMetadata()
        }

        // Process and save the image
        await transformedImage.toFile(outputPath)

        // Get the output file size
        const outputStats = await stat(outputPath)
        const savedBytes = originalStats.size - outputStats.size

        outputs.push({
          path: outputPath,
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
 * Optimizes an image using sharp with best practices for the format
 *
 * @param input Path to the input image
 * @param output Path to save the optimized image
 * @param options Optional configuration options
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

    const image = sharp(input)
    const imageMetadata = await image.metadata()
    const format = imageMetadata.format || 'unknown'

    // Apply appropriate options based on the format
    let optimizedImage = metadata ? image.withMetadata() : image

    switch (format) {
      case 'jpeg': {
        const jpegConfig = config.optimization?.jpeg
        optimizedImage = optimizedImage.jpeg({
          quality: options.quality || jpegConfig?.quality || quality,
          progressive: options.progressive !== undefined ? options.progressive : jpegConfig?.progressive || progressive,
          optimizeCoding: jpegConfig?.optimizeCoding || true,
          mozjpeg: jpegConfig?.mozjpeg || true,
        })
        break
      }
      case 'png': {
        const pngConfig = config.optimization?.png
        optimizedImage = optimizedImage.png({
          quality: options.quality || pngConfig?.quality || quality,
          progressive: options.progressive !== undefined ? options.progressive : pngConfig?.progressive || progressive,
          compressionLevel: pngConfig?.compressionLevel || 9,
          effort: options.effort || pngConfig?.effort || effort,
          palette: pngConfig?.palette || true,
        })
        break
      }
      case 'webp': {
        const webpConfig = config.optimization?.webp
        optimizedImage = optimizedImage.webp({
          quality: options.quality || webpConfig?.quality || quality,
          lossless: options.lossless !== undefined ? options.lossless : webpConfig?.lossless || lossless,
          effort: options.effort || webpConfig?.effort || effort,
          smartSubsample: webpConfig?.smartSubsample || true,
        })
        break
      }
      case 'avif': {
        const avifConfig = config.optimization?.avif
        optimizedImage = optimizedImage.avif({
          quality: options.quality || avifConfig?.quality || quality,
          lossless: options.lossless !== undefined ? options.lossless : avifConfig?.lossless || lossless,
          effort: options.effort || avifConfig?.effort || effort,
        })
        break
      }
      default:
        // For other formats, just copy the image in its original format
        optimizedImage = image
    }

    await optimizedImage.toFile(output)

    // Get the optimized file size
    const outputStats = await stat(output)
    const optimizedSize = outputStats.size

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
    rotate = 0,
    tiled = false,
    textOptions = {},
  } = options

  if (!text && !image) {
    throw new Error('Either text or image must be provided for watermarking')
  }

  // Set watermark type
  const watermarkType = text ? 'text' : 'image'
  debugLog('processor', `Applying ${watermarkType} watermark to ${typeof input === 'string' ? input : 'buffer'}`)

  // Process input image
  let inputBuffer: Buffer
  let inputPath: string

  if (typeof input === 'string') {
    inputBuffer = await readFile(input)
    inputPath = input
  }
  else {
    inputBuffer = input
    inputPath = 'buffer'
  }

  // Create the sharp instance for the input image
  const mainImage = sharp(inputBuffer)
  const inputMetadata = await mainImage.metadata()
  const inputWidth = inputMetadata.width || 0
  const inputHeight = inputMetadata.height || 0

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

  // Create the composite operations array for Sharp
  const compositeOps: Array<sharp.OverlayOptions> = []

  if (text) {
    // Text watermark settings
    const defaultTextOptions = config.watermark?.textOptions || {}
    const {
      font = defaultTextOptions.font || 'sans-serif',
      fontSize = defaultTextOptions.fontSize || 24,
      color = defaultTextOptions.color || 'rgba(255, 255, 255, 0.5)',
      background = defaultTextOptions.background || 'rgba(0, 0, 0, 0)',
      padding = defaultTextOptions.padding || 10,
      width = Math.floor(inputWidth * 0.8),
    } = textOptions

    // Create an SVG watermark with the text
    const svgText = text.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    const svgWidth = width
    // We make a rough estimate of the height based on font size and padding
    const svgHeight = fontSize + (padding * 2)

    const svgBuffer = Buffer.from(`
      <svg width="${svgWidth}" height="${svgHeight}">
        <rect width="100%" height="100%" fill="${background}"/>
        <text
          x="50%"
          y="50%"
          font-family="${font}"
          font-size="${fontSize}"
          fill="${color}"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          ${svgText}
        </text>
      </svg>
    `)

    // Create a sharp instance for the watermark to apply transformations
    let watermarkImage = sharp(svgBuffer)

    if (rotate !== 0) {
      watermarkImage = watermarkImage.rotate(rotate)
    }

    const watermarkBuffer = await watermarkImage.toBuffer()
    const watermarkMetadata = await sharp(watermarkBuffer).metadata()
    const watermarkWidth = watermarkMetadata.width || 0
    const watermarkHeight = watermarkMetadata.height || 0

    if (tiled) {
      // For tiled watermarks, we need both left and top even though they will be ignored
      const { left, top } = getPosition(watermarkWidth, watermarkHeight)
      compositeOps.push({
        input: watermarkBuffer,
        left,
        top,
        tile: true,
      })
    }
    else {
      const { left, top } = getPosition(watermarkWidth, watermarkHeight)
      compositeOps.push({
        input: watermarkBuffer,
        left,
        top,
      })
    }
  }
  else if (image) {
    // Image watermark
    let watermarkBuffer: Buffer

    if (typeof image === 'string') {
      watermarkBuffer = await readFile(image)
    }
    else {
      watermarkBuffer = image
    }

    // Process watermark image
    let watermarkImage = sharp(watermarkBuffer)

    // Apply scaling if needed
    if (scale !== 1) {
      const watermarkMetadata = await watermarkImage.metadata()
      const origWidth = watermarkMetadata.width || 0
      const origHeight = watermarkMetadata.height || 0

      // Calculate new dimensions based on scale
      // Use scaling relative to main image dimensions
      const newWidth = Math.floor(inputWidth * scale)
      const aspectRatio = origWidth / origHeight
      const newHeight = Math.floor(newWidth / aspectRatio)

      watermarkImage = watermarkImage.resize(newWidth, newHeight)
    }

    // Apply rotation if needed
    if (rotate !== 0) {
      watermarkImage = watermarkImage.rotate(rotate)
    }

    // Apply opacity using negate() twice with a threshold
    if (opacity < 1) {
      watermarkImage = watermarkImage.composite([{
        input: Buffer.from([0, 0, 0, Math.round(255 * (1 - opacity))]),
        raw: {
          width: 1,
          height: 1,
          channels: 4,
        },
        tile: true,
        blend: 'dest-in',
      }])
    }

    const processedWatermarkBuffer = await watermarkImage.toBuffer()
    const watermarkMetadata = await sharp(processedWatermarkBuffer).metadata()
    const watermarkWidth = watermarkMetadata.width || 0
    const watermarkHeight = watermarkMetadata.height || 0

    if (tiled) {
      // For tiled watermarks, we need both left and top even though they will be ignored
      const { left, top } = getPosition(watermarkWidth, watermarkHeight)
      compositeOps.push({
        input: processedWatermarkBuffer,
        left,
        top,
        tile: true,
      })
    }
    else {
      const { left, top } = getPosition(watermarkWidth, watermarkHeight)
      compositeOps.push({
        input: processedWatermarkBuffer,
        left,
        top,
      })
    }
  }

  // Apply the watermark to the main image
  const resultImage = await mainImage.composite(compositeOps)

  // Save the result or return as buffer
  let outputPath = output

  if (outputPath) {
    await ensureDir(outputPath)
    await resultImage.toFile(outputPath)
  }
  else if (typeof input === 'string') {
    // Default output path based on input
    const inputExt = extname(input)
    outputPath = input.replace(
      new RegExp(`${inputExt}$`),
      `.watermarked${inputExt}`,
    )
    await resultImage.toFile(outputPath)
  }
  else {
    // If no output path and input is buffer, just use 'buffer' as the path
    const _resultBuffer = await resultImage.toBuffer()
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
