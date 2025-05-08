import type { ImgxConfig } from './types'
import { resolve } from 'node:path'

// Default configuration values
export const defaultConfig: ImgxConfig = {
  verbose: true,
  cache: true,
  cacheDir: '.imgx-cache',
  concurrent: 4,
  skipOptimized: false,
  appIcon: {
    outputDir: 'assets/app-icons',
    platform: 'all',
  },
}

// In a production environment, we'd load from a config file
// For now, we'll just use the default config
export const config: ImgxConfig = defaultConfig
