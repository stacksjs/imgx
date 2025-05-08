import type { ImgxConfig } from './src/types'

const config: ImgxConfig = {
  verbose: true,
  cache: true,
  cacheDir: '.imgx-cache',
  concurrent: 4,
  skipOptimized: false,

  // App icon generation configuration
  appIcon: {
    outputDir: 'assets/app-icons',
    platform: 'all', // 'macos', 'ios', or 'all'
  },
}

export default config
