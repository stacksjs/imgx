import type { AppIconResult, AppIconSize, GetFilesOptions, ImageOptions, ImgxConfig, ImgxOptions, OptimizeResult, ProcessOptions, ScanOptions, SvgOptions } from '../src/types'
import { describe, expect, it } from 'bun:test'

describe('types', () => {
  it('should allow creating a valid ImgxConfig object', () => {
    const config: ImgxConfig = {
      verbose: true,
      cache: true,
      cacheDir: '.custom-cache',
      concurrent: 2,
      skipOptimized: true,
      appIcon: {
        outputDir: 'icons',
        platform: 'ios',
      },
    }

    expect(config).toBeDefined()
    expect(config.verbose).toBe(true)
    expect(config.cacheDir).toBe('.custom-cache')
  })

  it('should allow creating a valid ImgxOptions object with partial properties', () => {
    const options: ImgxOptions = {
      verbose: false,
      cache: false,
    }

    expect(options).toBeDefined()
    expect(options.verbose).toBe(false)
    expect(options.cache).toBe(false)
    expect(options.cacheDir).toBeUndefined()
  })

  it('should allow creating valid image processing options', () => {
    const imageOptions: ImageOptions = {
      quality: 85,
      resize: '400x300',
      format: 'webp',
      progressive: true,
      preserveMetadata: false,
    }

    expect(imageOptions).toBeDefined()
    expect(imageOptions.quality).toBe(85)
    expect(imageOptions.resize).toBe('400x300')
  })

  it('should allow creating valid SVG options', () => {
    const svgOptions: SvgOptions = {
      cleanup: true,
      prettify: false,
      removeComments: true,
      removeDimensions: true,
      removeViewBox: false,
    }

    expect(svgOptions).toBeDefined()
    expect(svgOptions.cleanup).toBe(true)
    expect(svgOptions.prettify).toBe(false)
  })

  it('should allow creating valid ProcessOptions', () => {
    const processOptions: ProcessOptions = {
      input: '/path/to/image.png',
      output: '/path/to/output.webp',
      quality: 90,
      format: 'webp',
      isSvg: false,
    }

    expect(processOptions).toBeDefined()
    expect(processOptions.input).toBe('/path/to/image.png')
    expect(processOptions.quality).toBe(90)
  })

  it('should allow creating valid OptimizeResult', () => {
    const result: OptimizeResult = {
      inputPath: 'input.png',
      outputPath: 'output.webp',
      inputSize: 100000,
      outputSize: 40000,
      saved: 60000,
      savedPercentage: 60,
    }

    expect(result).toBeDefined()
    expect(result.inputPath).toBe('input.png')
    expect(result.saved).toBe(60000)
    expect(result.savedPercentage).toBe(60)
  })
})
