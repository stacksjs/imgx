import { join } from 'node:path'
import sharp from 'sharp'
import { debugLog } from './utils'

export async function generateFavicons(
  input: string,
  outputDir: string,
): Promise<Array<{ size: number, path: string }>> {
  debugLog('favicon', `Generating favicons from ${input}`)

  const sizes = [16, 32, 48, 96, 144, 192, 512]
  const results = []

  for (const size of sizes) {
    const outputPath = join(outputDir, `favicon-${size}x${size}.png`)
    await sharp(input)
      .resize(size, size)
      .png()
      .toFile(outputPath)

    results.push({ size, path: outputPath })
  }

  // Generate favicon.ico with multiple sizes
  const icoPath = join(outputDir, 'favicon.ico')
  await sharp(input)
    .resize(32, 32)
    .toFormat('ico')
    .toFile(icoPath)

  results.push({ size: 32, path: icoPath })

  return results
}
