import { describe, expect, it } from 'bun:test'
import { bunImgxPlugin } from '../../bun-plugin/src'
import { viteImgxPlugin } from '../../vite-plugin/src'

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
