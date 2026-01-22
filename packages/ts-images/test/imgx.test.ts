import { describe, expect, it } from 'bun:test'
import * as imgx from '../src'

describe('@stacksjs/imgx', () => {
  it('should export all modules', () => {
    // Check core exports
    expect(imgx.process).toBeDefined()
    expect(imgx.processMultiple).toBeDefined()

    // Check processor exports
    expect(imgx.processImage).toBeDefined()
    expect(imgx.processSvg).toBeDefined()

    // Check app-icon exports
    expect(imgx.generateAppIcons).toBeDefined()
    expect(imgx.generateMacOSAppIcons).toBeDefined()
    expect(imgx.generateIOSAppIcons).toBeDefined()

    // Check other features
    expect(imgx.generateFavicons).toBeDefined()
    expect(imgx.generateResponsiveImages).toBeDefined()
    expect(imgx.generateSprite).toBeDefined()
    expect(imgx.analyzeImage).toBeDefined()
    expect(imgx.generateReport).toBeDefined()
    expect(imgx.generateThumbHash).toBeDefined()
    expect(imgx.generateSocialImages).toBeDefined()
  })

  it('should provide typing information', () => {
    // Type checking will be done by TypeScript compiler
    // This test is just a placeholder to check that the library can be imported
    expect(typeof imgx).toBe('object')
  })
})
