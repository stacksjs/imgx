import { readFile, stat } from 'node:fs/promises'
import sizeOf from 'image-size'
import sharp from 'sharp'

export interface ImageStats {
  path: string
  size: number
  format: string
  width: number
  height: number
  aspectRatio: number
  hasAlpha: boolean
  isAnimated: boolean
  colorSpace: string
  channels: number
  density: number
  compression?: string
  quality?: number
  optimizationPotential: 'low' | 'medium' | 'high'
  metadata: Record<string, any>
  warnings: string[]
}

export async function analyzeImage(path: string): Promise<ImageStats> {
  const warnings = []
  const fileStats = await stat(path)
  const buffer = await readFile(path)
  const dimensions = sizeOf(buffer)
  const metadata = await sharp(buffer).metadata()

  // Analyze optimization potential
  let optimizationPotential: 'low' | 'medium' | 'high' = 'low'

  // Check file size relative to dimensions
  const pixelCount = dimensions.width * dimensions.height
  const bytesPerPixel = fileStats.size / pixelCount

  if (bytesPerPixel > 4)
    optimizationPotential = 'high'
  else if (bytesPerPixel > 2)
    optimizationPotential = 'medium'

  // Check for common issues
  if (dimensions.width > 2000 || dimensions.height > 2000) {
    warnings.push('Image dimensions are very large')
    optimizationPotential = 'high'
  }

  if (fileStats.size > 1024 * 1024) {
    warnings.push('File size exceeds 1MB')
    optimizationPotential = 'high'
  }

  if (metadata.format === 'jpeg' && !metadata.isProgressive) {
    warnings.push('JPEG is not progressive')
  }

  if (metadata.format === 'png' && metadata.channels === 4 && !metadata.hasAlpha) {
    warnings.push('PNG has alpha channel but no transparency')
  }

  return {
    path,
    size: fileStats.size,
    format: metadata.format,
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: dimensions.width / dimensions.height,
    hasAlpha: metadata.hasAlpha,
    isAnimated: metadata.pages > 1,
    colorSpace: metadata.space,
    channels: metadata.channels,
    density: metadata.density,
    compression: metadata.compression,
    quality: metadata.quality,
    optimizationPotential,
    metadata,
    warnings,
  }
}

export async function generateReport(paths: string[]): Promise<{
  stats: ImageStats[]
  summary: {
    totalSize: number
    averageSize: number
    totalImages: number
    formatBreakdown: Record<string, number>
    potentialSavings: string
    warnings: string[]
  }
}> {
  const stats = await Promise.all(paths.map(analyzeImage))
  const totalSize = stats.reduce((sum, stat) => sum + stat.size, 0)

  const formatBreakdown = stats.reduce((acc, stat) => {
    acc[stat.format] = (acc[stat.format] || 0) + 1
    return acc
  }, {})

  const warnings = Array.from(new Set(stats.flatMap(s => s.warnings)))

  // Estimate potential savings
  const potentialSavings = stats.reduce((sum, stat) => {
    switch (stat.optimizationPotential) {
      case 'high': return sum + stat.size * 0.7
      case 'medium': return sum + stat.size * 0.4
      case 'low': return sum + stat.size * 0.1
      default: return sum
    }
  }, 0)

  return {
    stats,
    summary: {
      totalSize,
      averageSize: totalSize / stats.length,
      totalImages: stats.length,
      formatBreakdown,
      potentialSavings: `${Math.round(potentialSavings / 1024)}KB`,
      warnings,
    },
  }
}
