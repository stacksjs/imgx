import type { ImgxOptions, ProcessOptions } from '../src/types'
import { Buffer } from 'node:buffer'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import proc from 'node:process'
import { CAC } from 'cac'
import { version } from '../package.json'
import { formatReport, generateReport } from '../src/analyze'
import { process } from '../src/core'
import { generateSprite } from '../src/sprite-generator'
import { generateThumbHash } from '../src/thumbhash'
import { debugLog, formatBytes, getFiles } from '../src/utils'

const cli = new CAC('imgx')

cli
  .command('optimize [input] [output]', 'Optimize images and SVGs')
  .alias('o')
  .option('-q, --quality <number>', 'Image quality (1-100)', { default: 80 })
  .option('-r, --resize <string>', 'Resize image (e.g., "50%" or "800x600")')
  .option('-f, --format <string>', 'Output format (jpeg, png, webp, avif)')
  .option('-p, --progressive', 'Enable progressive mode for JPEG/PNG', { default: true })
  .option('-m, --preserve-metadata', 'Preserve image metadata')
  .option('--cleanup', 'Clean up SVG', { default: true })
  .option('--prettify', 'Prettify SVG output')
  .option('--remove-comments', 'Remove SVG comments', { default: true })
  .option('--remove-dimensions', 'Remove SVG dimensions')
  .option('--remove-viewbox', 'Remove SVG viewBox')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-w, --watch', 'Watch for file changes')
  .option('-R, --recursive', 'Process directories recursively')
  .option('-t, --thumbhash', 'Generate ThumbHash placeholder')
  .option('--thumbhash-size <size>', 'ThumbHash output size', { default: '32x32' })
  .option('--skip-existing', 'Skip already optimized files')
  .option('--max-size <size>', 'Maximum file size to process (e.g., "5MB")')
  .option('--min-size <size>', 'Minimum file size to process (e.g., "10KB")')
  .option('--output-dir <dir>', 'Output directory for batch processing')
  .option('--backup', 'Create backup of original files')
  .option('--responsive', 'Generate responsive image sizes')
  .option('--responsive-sizes <sizes>', 'Responsive image sizes (comma-separated)', { default: '320,768,1024,1920' })
  .option('--include <patterns>', 'Include patterns (comma-separated)', { default: '**/*.{jpg,jpeg,png,webp,avif,svg}' })
  .option('--exclude <patterns>', 'Exclude patterns (comma-separated)', { default: '**/node_modules/**,**/.git/**' })
  .option('--max-depth <number>', 'Maximum directory depth to process')
  .option('--follow-symlinks', 'Follow symbolic links', { default: false })
  .option('--dot', 'Process dotfiles', { default: false })
  .example('imgx optimize input.jpg')
  .example('imgx optimize input.jpg output.webp -q 75 -r 50%')
  .example('imgx optimize ./images -f webp -R')
  .action(async (input?: string, output?: string, options?: ProcessOptions & ImgxOptions) => {
    if (!input) {
      cli.outputHelp()
      return
    }

    try {
      // Parse file size limits if specified
      const maxSize = options.maxSize ? parseFileSize(options.maxSize) : Infinity
      const minSize = options.minSize ? parseFileSize(options.minSize) : 0

      // Parse include/exclude patterns
      const includePatterns = options.include.split(',').map(p => p.trim())
      const excludePatterns = options.exclude.split(',').map(p => p.trim())

      const files = await getFiles(input, {
        patterns: includePatterns,
        ignore: excludePatterns,
        maxDepth: options.maxDepth ? Number.parseInt(options.maxDepth) : undefined,
        followSymlinks: options.followSymlinks,
        dot: options.dot,
        absolute: true,
        onlyFiles: true,
      })

      if (files.length === 0) {
        console.error('No files found to process')
        proc.exit(1)
      }

      debugLog('cli', `Found ${files.length} files to process`)

      // Watch mode
      if (options.watch) {
        console.log('Watching for changes...')

        const cleanup = await watchFiles(input, includePatterns, async (file) => {
          console.log(`File ${file} has been changed`)
          await processFile(file, file, options)
        }, {
          dot: options.dot,
          followSymlinks: options.followSymlinks,
          ignore: excludePatterns,
        })

        // Handle cleanup on process exit
        proc.on('SIGINT', () => {
          cleanup()
          proc.exit(0)
        })

        return // Keep watching
      }

      // Single file processing
      if (files.length === 1 && output) {
        await processFile(files[0], output, options)
      }
      // Batch processing
      else {
        const outputDir = options.outputDir ? resolve(options.outputDir) : null
        const results = await Promise.all(
          files.map(async (file) => {
            const stats = await stat(file)
            if (stats.size < minSize || stats.size > maxSize) {
              debugLog('cli', `Skipping ${file} (size: ${stats.size} bytes)`)
              return null
            }

            if (options.skipExisting) {
              try {
                const outputStats = await stat(file)
                if (outputStats.mtimeMs > stats.mtimeMs) {
                  debugLog('cli', `Skipping ${file} (already optimized)`)
                  return null
                }
              }
              catch {} // Output doesn't exist, continue processing
            }

            const outputPath = outputDir
              ? join(outputDir, file.split('/').pop())
              : file

            if (options.backup) {
              const backupPath = `${file}.backup`
              await copyFile(file, backupPath)
              debugLog('cli', `Created backup: ${backupPath}`)
            }

            return processFile(file, outputPath, options)
          }),
        )

        const validResults = results.filter(Boolean)

        // Print summary
        const successful = validResults.filter(r => !r.error)
        const failed = validResults.filter(r => r.error)

        if (successful.length > 0) {
          const totalInputSize = successful.reduce((sum, r) => sum + r.inputSize, 0)
          const totalOutputSize = successful.reduce((sum, r) => sum + r.outputSize, 0)
          const totalSaved = totalInputSize - totalOutputSize
          const totalPercentage = (totalSaved / totalInputSize) * 100

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
            console.error(`- ${result.inputPath}: ${result.error.message}`)
          })
          proc.exit(1)
        }
      }
    }
    catch (error) {
      console.error(`Error: ${error.message}`)
      proc.exit(1)
    }
  })

cli
  .command('analyze [input]', 'Analyze images and generate optimization report')
  .alias('a')
  .option('-j, --json', 'Output as JSON')
  .option('-o, --output <file>', 'Save report to file')
  .option('--ci', 'Exit with error if optimization potential is high')
  .option('--threshold <size>', 'Size threshold for warnings (e.g., "500KB")')
  .action(async (input?: string, options?: { json?: boolean, output?: string, ci?: boolean, threshold?: string }) => {
    if (!input) {
      cli.outputHelp()
      return
    }

    try {
      const files = await getFiles(input, { recursive: true })
      const report = await generateReport(files)

      const output = options.json
        ? JSON.stringify(report, null, 2)
        : formatReport(report)

      if (options.output) {
        await writeFile(options.output, output)
        console.log(`Report saved to ${options.output}`)
      }
      else {
        console.log(output)
      }

      // CI mode
      if (options.ci) {
        const threshold = options.threshold ? parseFileSize(options.threshold) : 500 * 1024 // 500KB default
        const hasLargeFiles = report.stats.some(stat => stat.size > threshold)
        const hasHighPotential = report.stats.some(stat => stat.optimizationPotential === 'high')

        if (hasLargeFiles || hasHighPotential) {
          console.error('Found images that need optimization')
          proc.exit(1)
        }
      }
    }
    catch (error) {
      console.error(`Error: ${error.message}`)
      proc.exit(1)
    }
  })

cli
  .command('sprite [input] [output]', 'Generate sprite sheet from images')
  .alias('s')
  .option('-p, --prefix <prefix>', 'CSS class prefix', { default: 'sprite' })
  .option('-f, --format <format>', 'Output format (png, webp)', { default: 'png' })
  .option('-q, --quality <number>', 'Output quality', { default: 90 })
  .option('-s, --scale <number>', 'Scale factor', { default: 1 })
  .option('--padding <number>', 'Padding between sprites', { default: 2 })
  .option('--max-width <number>', 'Maximum sprite sheet width', { default: 2048 })
  .option('--retina', 'Generate retina sprite sheet')
  .option('--optimize', 'Optimize sprite sheet')
  .action(async (input?: string, output?: string, options?: any) => {
    if (!input || !output) {
      cli.outputHelp()
      return
    }

    try {
      const files = await getFiles(input)
      const images = files.map(file => ({
        path: file,
        name: file.split('/').pop()?.split('.')[0],
      }))

      // Generate normal sprite sheet
      const result = await generateSprite(images, output, options)

      // Generate retina sprite sheet if requested
      if (options.retina) {
        const retinaOptions = {
          ...options,
          scale: 2,
          prefix: `${options.prefix}-2x`,
        }
        const retinaResult = await generateSprite(images, output, retinaOptions)
        console.log('Generated retina sprite sheet:', retinaResult)
      }

      // Optimize if requested
      if (options.optimize) {
        await process({
          input: result.imagePath,
          output: result.imagePath,
          quality: options.quality,
        })
      }

      console.log(`
        Generated sprite sheet:
        - Image: ${result.imagePath}
        - CSS: ${result.cssPath}
        - Sprites: ${result.sprites.length}
        - Dimensions: ${result.width}x${result.height}
      `)
    }
    catch (error) {
      console.error(`Error: ${error.message}`)
      proc.exit(1)
    }
  })

cli
  .command('convert [input] [output]', 'Convert images between formats')
  .alias('c')
  .option('-f, --format <format>', 'Output format (jpeg, png, webp, avif)', { required: true })
  .option('-q, --quality <number>', 'Output quality', { default: 80 })
  .option('--strip', 'Strip metadata')
  .option('--keep-animation', 'Preserve animation frames')
  .option('-R, --recursive', 'Process directories recursively')
  .action(async (input?: string, output?: string, options?: any) => {
    if (!input) {
      cli.outputHelp()
      return
    }

    try {
      const files = await getFiles(input, { recursive: options.recursive })
      for (const file of files) {
        const outputPath = output || file.replace(/\.[^.]+$/, `.${options.format}`)
        await process({
          ...options,
          input: file,
          output: outputPath,
          format: options.format,
        })
      }
    }
    catch (error) {
      console.error(`Error: ${error.message}`)
      proc.exit(1)
    }
  })

async function processFile(input: string, output: string, options: ProcessOptions & ImgxOptions) {
  // Process main image
  const result = await process({
    ...options,
    input,
    output,
  })

  if (result.error) {
    console.error(`Error processing ${result.inputPath}: ${result.error.message}`)
    return result
  }

  // Generate ThumbHash if requested
  if (options.thumbhash) {
    try {
      const { hash, dataUrl } = await generateThumbHash(input)
      const [width, height] = options.thumbhashSize.split('x').map(Number)

      const thumbPath = `${output}.thumb.png`
      const hashPath = `${output}.thumb.hash`

      await writeFile(thumbPath, Buffer.from(dataUrl.split(',')[1], 'base64'))
      await writeFile(hashPath, hash)

      console.log(`Generated ThumbHash: ${thumbPath}`)
    }
    catch (error) {
      console.error(`Error generating ThumbHash: ${error.message}`)
    }
  }

  // Generate responsive images if requested
  if (options.responsive) {
    const sizes = options.responsiveSizes.split(',').map(Number)
    const ext = options.format || input.split('.').pop()

    for (const width of sizes) {
      const responsivePath = `${output.replace(`.${ext}`, '')}-${width}.${ext}`
      await process({
        ...options,
        input,
        output: responsivePath,
        resize: `${width}x`,
      })
    }
  }

  console.log(`
    Processed ${result.inputPath} -> ${result.outputPath}
    - Input size: ${formatBytes(result.inputSize)}
    - Output size: ${formatBytes(result.outputSize)}
    - Saved: ${formatBytes(result.saved)} (${result.savedPercentage.toFixed(2)}%)
  `)

  return result
}

cli
  .command('serve [directory]', 'Start development server with image optimization')
  .option('-p, --port <number>', 'Port number', { default: 3000 })
  .option('-H, --host <host>', 'Host to bind to', { default: 'localhost' })
  .option('--cache', 'Enable caching', { default: true })
  .action(async (directory = '.', options) => {
    try {
      const express = await import('express')
      const app = express.default()

      // Cache middleware
      if (options.cache) {
        app.use((req, res, next) => {
          res.setHeader('Cache-Control', 'public, max-age=31536000')
          next()
        })
      }

      // Image optimization middleware
      app.use(async (req, res, next) => {
        const path = join(directory, req.path)
        if (!path.match(/\.(jpg|jpeg|png|webp|avif|gif|svg)$/i)) {
          return next()
        }

        try {
          const query = req.query
          const result = await process({
            input: path,
            quality: Number.parseInt(query.quality as string) || 80,
            format: query.format as string,
            resize: query.size as string,
          })

          res.type(`image/${result.format || 'jpeg'}`)
          res.send(result.buffer)
        }
        catch (error) {
          next(error)
        }
      })

      app.listen(options.port, options.host, () => {
        console.log(`Server running at http://${options.host}:${options.port}`)
      })
    }
    catch (error) {
      console.error(`Error: ${error.message}`)
      proc.exit(1)
    }
  })

cli
  .command('completion', 'Generate shell completion script')
  .action(() => {
    // TODO: Implement shell completion generation
    console.log('Shell completion not implemented yet')
  })

cli.version(version)
cli.help()
cli.parse()
