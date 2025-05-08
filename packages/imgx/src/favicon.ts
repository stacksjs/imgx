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

  // For ico format, we need to use a temporary PNG and manually rename it
  // This is a workaround since Sharp doesn't directly support ICO format
  const tempPngPath = join(outputDir, 'favicon-32x32.png')

  // The favicon-32x32.png was already created in the loop above
  // We can just copy it to favicon.ico as a simple workaround
  await Bun.write(icoPath, await Bun.file(tempPngPath).arrayBuffer())

  results.push({ size: 32, path: icoPath })

  return results
}
