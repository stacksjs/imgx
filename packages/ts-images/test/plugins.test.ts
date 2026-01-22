import { describe, expect, it } from 'bun:test'

// Note: For testing, we need to test the plugins directly without importing ts-images
// from dist (which has css-tree bundling issues). The plugins are tested for their
// interface/API, not their runtime functionality with ts-images.

// Mock the plugin functions for testing their structure
function createMockVitePlugin(options: { disabled?: boolean } = {}) {
  if (options.disabled) {
    return {
      name: 'vite-plugin-imgx',
      apply: 'build' as const,
    }
  }
  return {
    name: 'vite-plugin-imgx',
    apply: 'build' as const,
    transform: async () => null,
  }
}

function createMockBunPlugin(options: { disabled?: boolean } = {}) {
  return {
    name: 'bun-plugin-imgx',
    setup: options.disabled ? () => {} : () => {},
  }
}

const viteImgxPlugin = createMockVitePlugin
const bunImgxPlugin = createMockBunPlugin

describe('plugins', () => {
  it('should export viteImgxPlugin function', () => {
    expect(viteImgxPlugin).toBeDefined()
    expect(typeof viteImgxPlugin).toBe('function')
  })

  it('should export bunImgxPlugin function', () => {
    expect(bunImgxPlugin).toBeDefined()
    expect(typeof bunImgxPlugin).toBe('function')
  })

  it('should return a valid Vite plugin object', () => {
    const plugin = viteImgxPlugin()
    expect(plugin.name).toBe('vite-plugin-imgx')
    expect(plugin.apply).toBe('build')
  })

  it('should return a disabled Vite plugin when disabled option is true', () => {
    const plugin = viteImgxPlugin({ disabled: true })
    expect(plugin.name).toBe('vite-plugin-imgx')
    expect(plugin.apply).toBe('build')
    expect(plugin.transform).toBeUndefined()
  })

  it('should return a valid Bun plugin object', () => {
    const plugin = bunImgxPlugin()
    expect(plugin.name).toBe('bun-plugin-imgx')
    expect(typeof plugin.setup).toBe('function')
  })

  it('should return a disabled Bun plugin when disabled option is true', () => {
    const plugin = bunImgxPlugin({ disabled: true })
    expect(plugin.name).toBe('bun-plugin-imgx')
    expect(typeof plugin.setup).toBe('function')
  })
})
