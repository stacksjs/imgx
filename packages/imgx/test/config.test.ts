import { describe, expect, it } from 'bun:test'
import { config, defaultConfig } from '../src/config'

describe('config', () => {
  it('should have the expected default values', () => {
    expect(defaultConfig).toMatchObject({
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

    expect(defaultConfig).toHaveProperty('verbose')
    expect(defaultConfig).toHaveProperty('cache')
    expect(defaultConfig).toHaveProperty('cacheDir')
    expect(defaultConfig).toHaveProperty('concurrent')
    expect(defaultConfig).toHaveProperty('skipOptimized')
    expect(defaultConfig).toHaveProperty('appIcon')
  })

  it('should expose the config object', () => {
    expect(config).toBeDefined()
  })
})
