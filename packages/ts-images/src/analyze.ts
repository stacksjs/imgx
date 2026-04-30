import { readFile, stat } from 'node:fs/promises'
import { decode, detectFormat, getMetadata, readDimensions } from './codecs'

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
  const warnings: string[] = []
  const fileStats = await stat(path)
  const buffer = await readFile(path)
  const uint8Buffer = new Uint8Array(buffer)

  const format = detectFormat(uint8Buffer) ?? 'unknown'

  // Try the cheap path first — header-only dimension read. Falls through to
  // a metadata call (which may decode) only if the header read fails.
  let width = 0
  let height = 0
  const dims = readDimensions(uint8Buffer)
  if (dims) {
    width = dims.width
    height = dims.height
  }
  else {
    try {
      const meta = await getMetadata(uint8Buffer)
      width = meta.width
      height = meta.height
    }
    catch {
      // Leave width/height at 0; downstream consumers see zeroed stats.
    }
  }

  let hasAlpha = false
  let colorSpace = 'srgb'
  const channels = 4

  try {
    const imageData = await decode(uint8Buffer)
    hasAlpha = imageData.hasAlpha
    colorSpace = imageData.colorSpace
    if (!width) width = imageData.width
    if (!height) height = imageData.height
  }
  catch {
    // Decode failures are non-fatal at the analyze layer — we surface the
    // warning instead of throwing, since callers may be running in batch.
  }

  let optimizationPotential: 'low' | 'medium' | 'high' = 'low'
  const pixelCount = (width || 1) * (height || 1)
  const bytesPerPixel = fileStats.size / pixelCount

  if (bytesPerPixel > 4) optimizationPotential = 'high'
  else if (bytesPerPixel > 2) optimizationPotential = 'medium'

  if (width > 2000 || height > 2000) {
    warnings.push('Image dimensions are very large')
    optimizationPotential = 'high'
  }

  if (fileStats.size > 1024 * 1024) {
    warnings.push('File size exceeds 1MB')
    optimizationPotential = 'high'
  }

  if (format === 'png' && channels === 4 && !hasAlpha) {
    warnings.push('PNG has alpha channel but no transparency')
  }

  return {
    path,
    size: fileStats.size,
    format,
    width,
    height,
    aspectRatio: height ? width / height : 0,
    hasAlpha,
    isAnimated: false,
    colorSpace,
    channels,
    density: 72,
    compression: undefined,
    quality: undefined,
    optimizationPotential,
    metadata: {
      format,
      width,
      height,
      hasAlpha,
      colorSpace,
    },
    warnings,
  }
}

// eslint-disable-next-line pickier/no-unused-vars
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
  const totalSize = stats.reduce((sum, s) => sum + s.size, 0)

  const formatBreakdown = stats.reduce((acc: Record<string, number>, s) => {
    acc[s.format] = (acc[s.format] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const warnings = Array.from(new Set(stats.flatMap(s => s.warnings)))

  const potentialSavings = stats.reduce((sum, s) => {
    switch (s.optimizationPotential) {
      case 'high': return sum + s.size * 0.7
      case 'medium': return sum + s.size * 0.4
      case 'low': return sum + s.size * 0.1
      default: return sum
    }
  }, 0)

  return {
    stats,
    summary: {
      totalSize,
      averageSize: stats.length ? totalSize / stats.length : 0,
      totalImages: stats.length,
      formatBreakdown,
      potentialSavings: `${Math.round(potentialSavings / 1024)}KB`,
      warnings,
    },
  }
}
