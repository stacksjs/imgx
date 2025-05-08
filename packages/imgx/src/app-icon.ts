import type { AppIconResult, AppIconSize } from './types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'
import { config } from './config'
import { debugLog } from './utils'

// macOS App Icon sizes based on Apple's requirements
const macOSSizes: AppIconSize[] = [
  { size: 16, scale: 1, idiom: 'mac', filename: 'AppIcon-16.png' },
  { size: 16, scale: 2, idiom: 'mac', filename: 'AppIcon-16@2x.png' },
  { size: 32, scale: 1, idiom: 'mac', filename: 'AppIcon-32.png' },
  { size: 32, scale: 2, idiom: 'mac', filename: 'AppIcon-32@2x.png' },
  { size: 128, scale: 1, idiom: 'mac', filename: 'AppIcon-128.png' },
  { size: 128, scale: 2, idiom: 'mac', filename: 'AppIcon-128@2x.png' },
  { size: 256, scale: 1, idiom: 'mac', filename: 'AppIcon-256.png' },
  { size: 256, scale: 2, idiom: 'mac', filename: 'AppIcon-256@2x.png' },
  { size: 512, scale: 1, idiom: 'mac', filename: 'AppIcon-512.png' },
  { size: 512, scale: 2, idiom: 'mac', filename: 'AppIcon-512@2x.png' },
]

// iOS App Icon sizes
const iOSSizes: AppIconSize[] = [
  { size: 20, scale: 1, idiom: 'iphone', filename: 'AppIcon-20.png' },
  { size: 20, scale: 2, idiom: 'iphone', filename: 'AppIcon-20@2x.png' },
  { size: 20, scale: 3, idiom: 'iphone', filename: 'AppIcon-20@3x.png' },
  { size: 29, scale: 1, idiom: 'iphone', filename: 'AppIcon-29.png' },
  { size: 29, scale: 2, idiom: 'iphone', filename: 'AppIcon-29@2x.png' },
  { size: 29, scale: 3, idiom: 'iphone', filename: 'AppIcon-29@3x.png' },
  { size: 40, scale: 2, idiom: 'iphone', filename: 'AppIcon-40@2x.png' },
  { size: 40, scale: 3, idiom: 'iphone', filename: 'AppIcon-40@3x.png' },
  { size: 60, scale: 2, idiom: 'iphone', filename: 'AppIcon-60@2x.png' },
  { size: 60, scale: 3, idiom: 'iphone', filename: 'AppIcon-60@3x.png' },
  { size: 20, scale: 1, idiom: 'ipad', filename: 'AppIcon-20-ipad.png' },
  { size: 20, scale: 2, idiom: 'ipad', filename: 'AppIcon-20@2x-ipad.png' },
  { size: 29, scale: 1, idiom: 'ipad', filename: 'AppIcon-29-ipad.png' },
  { size: 29, scale: 2, idiom: 'ipad', filename: 'AppIcon-29@2x-ipad.png' },
  { size: 40, scale: 1, idiom: 'ipad', filename: 'AppIcon-40.png' },
  { size: 40, scale: 2, idiom: 'ipad', filename: 'AppIcon-40@2x-ipad.png' },
  { size: 76, scale: 1, idiom: 'ipad', filename: 'AppIcon-76.png' },
  { size: 76, scale: 2, idiom: 'ipad', filename: 'AppIcon-76@2x.png' },
  { size: 83.5, scale: 2, idiom: 'ipad', filename: 'AppIcon-83.5@2x.png' },
  { size: 1024, scale: 1, idiom: 'ios-marketing', filename: 'AppIcon-1024.png' },
] as AppIconSize[]

// Ensure the output directory exists
async function ensureOutputDir(outputDir: string): Promise<void> {
  await mkdir(outputDir, { recursive: true })

  // For macOS, create the AppIcon.appiconset directory
  await mkdir(join(outputDir, 'AppIcon.appiconset'), { recursive: true })
}

/**
 * Generate macOS app icons from a source image
 *
 * @param input Source image path
 * @param outputDir Output directory for generated icons
 * @returns Information about the generated icons
 */
export async function generateMacOSAppIcons(
  input: string,
  outputDir: string = config.appIcon?.outputDir || 'assets/app-icons',
): Promise<AppIconResult> {
  const fullOutputDir = resolve(outputDir, 'AppIcon.appiconset')
  await ensureOutputDir(outputDir)

  debugLog('app-icon', `Generating macOS app icons from ${input} to ${fullOutputDir}`)

  const results = []

  // Generate all icon sizes
  for (const { size, scale, filename } of macOSSizes) {
    const pixelSize = size * scale
    const outputPath = join(fullOutputDir, filename)

    await sharp(input)
      .resize(pixelSize, pixelSize)
      .png()
      .toFile(outputPath)

    results.push({
      size: pixelSize,
      path: outputPath,
      filename,
    })
  }

  // Generate Contents.json
  const contentsJson = generateContentsJson('macos', macOSSizes)
  const contentsPath = join(fullOutputDir, 'Contents.json')
  await writeFile(contentsPath, contentsJson)

  // Generate README with instructions
  await generateReadme(outputDir, 'macos')

  return {
    platform: 'macos',
    sizes: results,
    contentsJson,
  }
}

/**
 * Generate iOS app icons from a source image
 *
 * @param input Source image path
 * @param outputDir Output directory for generated icons
 * @returns Information about the generated icons
 */
export async function generateIOSAppIcons(
  input: string,
  outputDir: string = config.appIcon?.outputDir || 'assets/app-icons',
): Promise<AppIconResult> {
  const fullOutputDir = resolve(outputDir, 'AppIcon.appiconset')
  await ensureOutputDir(outputDir)

  debugLog('app-icon', `Generating iOS app icons from ${input} to ${fullOutputDir}`)

  const results = []

  // Generate all icon sizes
  for (const { size, scale, filename } of iOSSizes) {
    const pixelSize = Math.round(size * scale)
    const outputPath = join(fullOutputDir, filename)

    await sharp(input)
      .resize(pixelSize, pixelSize)
      .png()
      .toFile(outputPath)

    results.push({
      size: pixelSize,
      path: outputPath,
      filename,
    })
  }

  // Generate Contents.json
  const contentsJson = generateContentsJson('ios', iOSSizes)
  const contentsPath = join(fullOutputDir, 'Contents.json')
  await writeFile(contentsPath, contentsJson)

  // Generate README with instructions
  await generateReadme(outputDir, 'ios')

  return {
    platform: 'ios',
    sizes: results,
    contentsJson,
  }
}

/**
 * Generate app icons for all supported platforms
 *
 * @param input Source image path
 * @param options Configuration options
 * @returns Information about the generated icons
 */
export async function generateAppIcons(
  input: string,
  options: {
    outputDir?: string
    platform?: 'macos' | 'ios' | 'all'
  } = {},
): Promise<AppIconResult[]> {
  const platform = options.platform || config.appIcon?.platform || 'all'
  const outputDir = options.outputDir || config.appIcon?.outputDir || 'assets/app-icons'

  const results: AppIconResult[] = []

  if (platform === 'macos' || platform === 'all') {
    results.push(await generateMacOSAppIcons(input, outputDir))
  }

  if (platform === 'ios' || platform === 'all') {
    results.push(await generateIOSAppIcons(input, outputDir))
  }

  return results
}

/**
 * Generate Contents.json file for Xcode asset catalogs
 */
function generateContentsJson(platform: 'ios' | 'macos', sizes: AppIconSize[]): string {
  const images = sizes.map(({ size, scale, idiom, filename }) => ({
    size: `${size}x${size}`,
    idiom,
    filename,
    scale: `${scale}x`,
  }))

  const contents = {
    images,
    info: {
      version: 1,
      author: 'imgx',
    },
  }

  return JSON.stringify(contents, null, 2)
}

/**
 * Generate README file with installation instructions
 */
async function generateReadme(outputDir: string, platform: string | string[]): Promise<void> {
  const platforms = Array.isArray(platform) ? platform : [platform]
  const readmePath = join(outputDir, 'README.md')

  let content = `# App Icons Generated with imgx\n\n`

  if (platforms.includes('macos')) {
    content += `## macOS App Icons\n\n`
    content += `To use these icons in your macOS app:\n\n`
    content += `1. In Xcode, open your project\n`
    content += `2. In the Project Navigator, find your Assets.xcassets folder\n`
    content += `3. Drag the entire \`AppIcon.appiconset\` folder into the Assets.xcassets folder\n`
    content += `4. Ensure the "AppIcon" is set as the app icon in your target's settings\n\n`
  }

  if (platforms.includes('ios')) {
    content += `## iOS App Icons\n\n`
    content += `To use these icons in your iOS app:\n\n`
    content += `1. In Xcode, open your project\n`
    content += `2. In the Project Navigator, find your Assets.xcassets folder\n`
    content += `3. Drag the entire \`AppIcon.appiconset\` folder into the Assets.xcassets folder\n`
    content += `4. Ensure the "AppIcon" is set as the app icon in your target's settings\n\n`
  }

  content += `## Icon Sizes\n\n`

  if (platforms.includes('macos')) {
    content += `### macOS\n\n`
    content += `| Size | Scale | Filename |\n`
    content += `| --- | --- | --- |\n`

    for (const { size, scale, filename } of macOSSizes) {
      content += `| ${size}x${size} | ${scale}x | ${filename} |\n`
    }

    content += `\n`
  }

  if (platforms.includes('ios')) {
    content += `### iOS\n\n`
    content += `| Size | Scale | Idiom | Filename |\n`
    content += `| --- | --- | --- | --- |\n`

    for (const { size, scale, idiom, filename } of iOSSizes) {
      content += `| ${size}x${size} | ${scale}x | ${idiom} | ${filename} |\n`
    }
  }

  await writeFile(readmePath, content)
}
