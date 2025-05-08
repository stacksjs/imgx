#!/usr/bin/env bun
/**
 * Simple test script to try out the app icon generation feature
 *
 * Usage:
 *   bun test/test-app-icon.ts path/to/source-icon.png
 */

import { generateAppIcons } from '../src/app-icon'
import { resolve } from 'node:path'

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.error('Usage: bun test/test-app-icon.ts path/to/source-icon.png [output-dir] [platform]')
    process.exit(1)
  }

  const sourcePath = resolve(args[0])
  const outputDir = args[1] ? resolve(args[1]) : 'test-icons'
  const platform = args[2] as 'macos' | 'ios' | 'all' || 'all'

  console.log(`Generating app icons from ${sourcePath}`)
  console.log(`Output directory: ${outputDir}`)
  console.log(`Platform: ${platform}`)

  try {
    const results = await generateAppIcons(sourcePath, {
      outputDir,
      platform,
    })

    console.log('\nGenerated app icons:')

    for (const result of results) {
      console.log(`\n${result.platform.toUpperCase()}:`)
      console.log(`- Output directory: ${outputDir}/AppIcon.appiconset`)
      console.log(`- Generated ${result.sizes.length} icon sizes`)

      // Print the first few sizes as examples
      const examples = result.sizes.slice(0, 3)
      for (const size of examples) {
        console.log(`  - ${size.filename} (${size.size}x${size.size}px)`)
      }
      console.log(`  - ... and ${result.sizes.length - 3} more`)
    }

    console.log('\nDone! Check the output directory for your generated icons.')
    console.log('You can find installation instructions in the README.md file in the output directory.')
  } catch (error) {
    console.error('Error generating app icons:', error.message)
    process.exit(1)
  }
}

main()