import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { composite, createImageData, resize } from './core'
import type { ImageData } from './core'
import { decode, encode } from './codecs'
import { debugLog } from './utils'

interface SpriteConfig {
  padding?: number
  maxWidth?: number
  prefix?: string
  format?: 'png' | 'webp'
  quality?: number
  scale?: number
}

interface SpriteResult {
  imagePath: string
  cssPath: string
  width: number
  height: number
  sprites: Array<{
    name: string
    x: number
    y: number
    width: number
    height: number
  }>
}

export async function generateSprite(
  images: Array<{ path: string, name: string }>,
  outputDir: string,
  config: SpriteConfig = {},
): Promise<SpriteResult> {
  const {
    padding = 2,
    maxWidth = 2048,
    prefix = 'sprite',
    format = 'png',
    quality = 90,
    scale = 1,
  } = config

  debugLog('sprite', `Generating sprite sheet from ${images.length} images`)

  // Load and process all images
  const sprites = await Promise.all(
    images.map(async ({ path, name }) => {
      const buffer = await readFile(path)
      const imageData = await decode(buffer)

      // Apply scaling if needed
      let processedData = imageData
      if (scale !== 1) {
        const width = Math.ceil(imageData.width * scale)
        const height = Math.ceil(imageData.height * scale)
        processedData = resize(imageData, { width, height })
      }

      return {
        name,
        imageData: processedData,
        width: processedData.width,
        height: processedData.height,
      }
    }),
  )

  // Simple packing algorithm
  let currentX = 0
  let currentY = 0
  let rowHeight = 0
  let spriteWidth = 0
  let maxHeight = 0

  const positions = sprites.map((sprite) => {
    if (currentX + sprite.width + padding > maxWidth) {
      currentX = 0
      currentY += rowHeight + padding
      rowHeight = 0
    }

    const position = {
      x: currentX,
      y: currentY,
      width: sprite.width,
      height: sprite.height,
    }

    currentX += sprite.width + padding
    rowHeight = Math.max(rowHeight, sprite.height)
    spriteWidth = Math.max(spriteWidth, currentX)
    maxHeight = Math.max(maxHeight, currentY + sprite.height)

    return position
  })

  // Create sprite sheet canvas with transparent background
  let spriteSheet = createImageData(spriteWidth, maxHeight, {
    fill: { r: 0, g: 0, b: 0, a: 0 },
  })

  // Composite each sprite onto the sheet
  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i]
    const pos = positions[i]

    spriteSheet = composite(spriteSheet, sprite.imageData, {
      left: pos.x,
      top: pos.y,
      blend: 'normal',
    })
  }

  // Encode and save the sprite sheet
  const spritePath = join(outputDir, `${prefix}-sprite.${format}`)
  const outputBuffer = await encode(spriteSheet, format, { quality })
  await writeFile(spritePath, outputBuffer)

  // Generate CSS
  const spriteData = positions.map((pos, i) => ({
    name: sprites[i].name,
    ...pos,
  }))

  const css = generateCSS(prefix, spriteData, format)
  const cssPath = join(outputDir, `${prefix}-sprite.css`)
  await writeFile(cssPath, css)

  // Generate SCSS
  const scss = generateSCSS(prefix, spriteData, format)
  const scssPath = join(outputDir, `${prefix}-sprite.scss`)
  await writeFile(scssPath, scss)

  return {
    imagePath: spritePath,
    cssPath,
    width: spriteWidth,
    height: maxHeight,
    sprites: spriteData,
  }
}

function generateCSS(prefix: string, sprites: Array<{ name: string, x: number, y: number, width: number, height: number }>, format: string): string {
  return `
.${prefix} {
  background-image: url('./${prefix}-sprite.${format}');
  background-repeat: no-repeat;
  display: inline-block;
}

${sprites
  .map(
    sprite => `
.${prefix}-${sprite.name} {
  width: ${sprite.width}px;
  height: ${sprite.height}px;
  background-position: -${sprite.x}px -${sprite.y}px;
}
`,
  )
  .join('\n')}

/* Retina support */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .${prefix} {
    background-size: ${sprites[0].width * 2}px ${sprites[0].height * 2}px;
  }
}
`
}

function generateSCSS(prefix: string, sprites: Array<{ name: string, x: number, y: number, width: number, height: number }>, format: string): string {
  return `
$${prefix}-sprites: (
${sprites
  .map(
    sprite => `
  '${sprite.name}': (
    x: -${sprite.x}px,
    y: -${sprite.y}px,
    width: ${sprite.width}px,
    height: ${sprite.height}px
  )`,
  )
  .join(',\n')}
);

@mixin ${prefix}-sprite($name) {
  $sprite: map-get($${prefix}-sprites, $name);

  width: map-get($sprite, 'width');
  height: map-get($sprite, 'height');
  background-position: map-get($sprite, 'x') map-get($sprite, 'y');
  background-image: url('./${prefix}-sprite.${format}');
  background-repeat: no-repeat;
  display: inline-block;

  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    $w: map-get($sprite, 'width');
    $h: map-get($sprite, 'height');
    background-size: $w * 2 $h * 2;
  }
}
`
}
