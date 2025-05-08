import { describe, expect, it } from 'bun:test'
import { config, defaultConfig } from '../src/config'

describe('config', () => {
  it('should have the expected default values', () => {
    expect(defaultConfig).toEqual({
      verbose: true,
      cache: true,
      cacheDir: '.imgx-cache',
      concurrent: 4,
      skipOptimized: false,
      appIcon: {
        outputDir: 'assets/app-icons',
        platform: 'all',
      },
    })
  })

  it('should expose the config object', () => {
    expect(config).toBeDefined()
    expect(config).toEqual(defaultConfig)
  })
})
