import { describe, expect, it } from 'bun:test'
import { bunImgxPlugin, viteImgxPlugin } from '../src/plugins'

// Mock the process object to avoid process.env.NODE_ENV error
globalThis.process = globalThis.process || { env: {} }

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

  it('should return a valid Bun plugin object', () => {
    const plugin = bunImgxPlugin()
    expect(plugin.name).toBe('bun-plugin-imgx')
    expect(typeof plugin.setup).toBe('function')
  })
})
