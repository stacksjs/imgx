import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resize } from './core'
import { decode, encode } from './codecs'
import { debugLog } from './utils'

export async function generateFavicons(
  input: string,
  outputDir: string,
): Promise<Array<{ size: number, path: string }>> {
  debugLog('favicon', `Generating favicons from ${input}`)

  const sizes = [16, 32, 48, 96, 144, 192, 512]
  const results = []

  // Read and decode the source image
  const inputBuffer = await readFile(input)
  const imageData = await decode(inputBuffer)

  for (const size of sizes) {
    const outputPath = join(outputDir, `favicon-${size}x${size}.png`)

    // Resize and encode as PNG
    const resized = resize(imageData, { width: size, height: size })
    const pngBuffer = await encode(resized, 'png')
    await writeFile(outputPath, pngBuffer)

    results.push({ size, path: outputPath })
  }

  // Generate favicon.ico with multiple sizes
  const icoPath = join(outputDir, 'favicon.ico')

  // For ico format, we need to use a temporary PNG and manually rename it
  // This is a workaround since we don't directly support ICO format
  const tempPngPath = join(outputDir, 'favicon-32x32.png')

  // The favicon-32x32.png was already created in the loop above
  // We can just copy it to favicon.ico as a simple workaround
  await Bun.write(icoPath, await Bun.file(tempPngPath).arrayBuffer())

  results.push({ size: 32, path: icoPath })

  return results
}
