import type { ImgxOptions, ProcessOptions } from '../src/types'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CAC } from 'cac'
import glob from 'fast-glob'
import { version } from '../package.json'
import { process, processMultiple } from '../src/core'
import { debugLog } from '../src/utils'

const cli = new CAC('imgx')

async function getFiles(path: string): Promise<string[]> {
  const stats = await stat(path)
  if (stats.isDirectory()) {
    return glob('**/*.{jpg,jpeg,png,webp,avif,svg}', {
      cwd: path,
      absolute: true,
    })
  }
  return [resolve(path)]
}

cli
  .command('[input] [output]', 'Optimize images and SVGs')
  .option('--quality <number>', 'Image quality (1-100)', { default: 80 })
  .option('--resize <string>', 'Resize image (e.g., "50%" or "800x600")')
  .option('--format <string>', 'Output format (jpeg, png, webp, avif)')
  .option('--progressive', 'Enable progressive mode for JPEG/PNG', { default: true })
  .option('--preserve-metadata', 'Preserve image metadata')
  .option('--cleanup', 'Clean up SVG', { default: true })
  .option('--prettify', 'Prettify SVG output')
  .option('--remove-comments', 'Remove SVG comments', { default: true })
  .option('--remove-dimensions', 'Remove SVG dimensions')
  .option('--remove-viewbox', 'Remove SVG viewBox')
  .option('--verbose', 'Enable verbose logging')
  .example('imgx input.jpg')
  .example('imgx input.jpg output.webp --quality 75 --resize 50%')
  .example('imgx ./images --format webp')
  .action(async (input?: string, output?: string, options?: ProcessOptions & ImgxOptions) => {
    if (!input) {
      cli.outputHelp()
      return
    }

    try {
      const files = await getFiles(input)

      if (files.length === 0) {
        console.error('No files found to process')
        process.exit(1)
      }

      debugLog('cli', `Found ${files.length} files to process`)

      if (files.length === 1 && output) {
        // Single file with output path
        const result = await process({
          ...options,
          input: files[0],
          output,
        })

        if (result.error) {
          console.error(`Error processing ${result.inputPath}: ${result.error.message}`)
          process.exit(1)
        }

        console.log(`
          Processed ${result.inputPath} -> ${result.outputPath}
          - Input size: ${result.inputSize} bytes
          - Output size: ${result.outputSize} bytes
          - Saved: ${result.saved} bytes (${result.savedPercentage.toFixed(2)}%)
        `)
      }
      else {
        // Multiple files or single file without output path
        const results = await processMultiple(files, options)

        const successful = results.filter(r => !r.error)
        const failed = results.filter(r => r.error)

        if (successful.length > 0) {
          const totalSaved = successful.reduce((sum, r) => sum + r.saved, 0)
          const totalPercentage = (totalSaved / successful.reduce((sum, r) => sum + r.inputSize, 0)) * 100

          console.log(`
            Successfully processed ${successful.length} files:
            - Total input size: ${successful.reduce((sum, r) => sum + r.inputSize, 0)} bytes
            - Total output size: ${successful.reduce((sum, r) => sum + r.outputSize, 0)} bytes
            - Total saved: ${totalSaved} bytes (${totalPercentage.toFixed(2)}%)
          `)
        }

        if (failed.length > 0) {
          console.error(`\nFailed to process ${failed.length} files:`)
          failed.forEach((result) => {
            console.error(`- ${result.inputPath}: ${result.error.message}`)
          })
          process.exit(1)
        }
      }
    }
    catch (error) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
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
