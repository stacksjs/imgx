#!/usr/bin/env bun
/**
 * Script to generate macOS app icons for the Hush app
 *
 * Usage:
 *   bun test/generate-hush-icons.ts path/to/app-icon.png
 */

import { generateMacOSAppIcons } from '../src/app-icon'
import { resolve } from 'node:path'

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.error('Usage: bun test/generate-hush-icons.ts path/to/app-icon.png [output-dir]')
    process.exit(1)
  }

  const sourcePath = resolve(args[0])
  // Default output to the Hush app's Assets.xcassets directory
  const outputDir = args[1] ? resolve(args[1]) : resolve('../../../Hush/Hush/Assets.xcassets')

  console.log(`Generating macOS app icons for Hush from ${sourcePath}`)
  console.log(`Output directory: ${outputDir}`)

  try {
    const result = await generateMacOSAppIcons(sourcePath, outputDir)

    console.log('\nGenerated app icons for Hush:')
    console.log(`- Output directory: ${outputDir}/AppIcon.appiconset`)
    console.log(`- Generated ${result.sizes.length} icon sizes:`)

    // Print all sizes
    for (const size of result.sizes) {
      console.log(`  - ${size.filename} (${size.size}x${size.size}px)`)
    }

    console.log('\nDone! The icons have been placed in your Xcode project.')
    console.log('You can find installation instructions in the README.md file in the output directory.')
  } catch (error: any) {
    console.error('Error generating app icons:', error.message)
    process.exit(1)
  }
}

main()