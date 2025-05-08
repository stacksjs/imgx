import type { ImgxConfig } from './types'
import { resolve } from 'node:path'

// Default configuration values
export const defaultConfig: ImgxConfig = {
  verbose: true,
  cache: true,
  cacheDir: '.imgx-cache',
  concurrent: 4,
  skipOptimized: false,

  // Default settings for image processing
  quality: 80,
  format: 'webp',
  progressive: true,
  preserveMetadata: false,

  // App icon generation settings
  appIcon: {
    outputDir: 'assets/app-icons',
    platform: 'all',
  },

  // Responsive image generation settings
  responsive: {
    sizes: [320, 640, 960, 1280, 1920],
    formats: ['webp', 'jpeg'],
    quality: 80,
    generateSrcset: true,
    filenameTemplate: '[name]-[width].[ext]',
  },

  // Sprite sheet generation settings
  sprites: {
    padding: 2,
    maxWidth: 2048,
    prefix: 'sprite',
    format: 'png',
    quality: 90,
    scale: 1,
  },

  // Placeholder generation settings
  placeholders: {
    width: 20,
    quality: 50,
    format: 'webp',
    blurLevel: 40,
    base64Encode: true,
    useThumbhash: false,
    strategy: 'blur',
    saturation: 1.2,
    cssFilter: false,
  },

  // Batch processing settings
  batch: {
    formats: ['webp'],
    quality: 80,
    recursive: false,
    filter: '\.(jpe?g|png|gif|bmp|tiff?)$', // Regex pattern string
    skipExisting: true,
    concurrency: 4,
    preserveStructure: true,
    filenameTemplate: '[name].[format]',
    preserveMetadata: false,
    optimizationPreset: 'web',
  },

  // Image optimization settings
  optimization: {
    quality: 80,
    lossless: false,
    progressive: true,
    effort: 7,
    preserveMetadata: false,

    // Format-specific optimization settings
    jpeg: {
      quality: 85,
      progressive: true,
      optimizeCoding: true,
      mozjpeg: true,
      chromaSubsampling: '4:2:0',
    },
    png: {
      quality: 80,
      progressive: true,
      compressionLevel: 9,
      effort: 7,
      palette: true,
      adaptiveFiltering: true,
    },
    webp: {
      quality: 80,
      lossless: false,
      effort: 6,
      smartSubsample: true,
    },
    avif: {
      quality: 70,
      lossless: false,
      effort: 7,
    },
  },

  // Format conversion settings
  conversion: {
    quality: 80,
    lossless: false,
    progressive: true,
    filenamePrefix: '',
    filenameSuffix: '',
    preserveMetadata: false,
    optimizationLevel: 6,
    effort: 6,
    chromaSubsampling: '4:2:0',
    smartSubsample: true,
  },

  // Social image generation settings
  social: {
    quality: 85,
    customSizes: {
      'og-github': { width: 1280, height: 640 },
      'og-facebook': { width: 1200, height: 630 },
      'og-twitter': { width: 1200, height: 600 },
      'og-linkedin': { width: 1104, height: 736 },
      'og-instagram': { width: 1080, height: 1080 },
    },
  },

  // Image transformation settings
  transformations: {
    // Default transformation chains that can be referred to by name
    presets: {
      webOptimized: [
        { type: 'resize', options: { width: 1200, withoutEnlargement: true } },
      ],
      thumbnail: [
        { type: 'resize', options: { width: 300, height: 300, fit: 'inside' } },
      ],
      grayscale: [
        { type: 'grayscale' },
      ],
      sharpen: [
        { type: 'sharpen', options: { sigma: 1 } },
      ],
    },
  },

  // Watermarking settings
  watermark: {
    position: 'bottom-right',
    opacity: 0.5,
    margin: 20,
    scale: 0.2,
    textOptions: {
      font: 'sans-serif',
      fontSize: 24,
      color: 'rgba(255, 255, 255, 0.7)',
      background: 'rgba(0, 0, 0, 0.3)',
      padding: 10,
    },
  },
}

// In a production environment, we'd load from a config file
// For now, we'll just use the default config
export const config: ImgxConfig = defaultConfig
