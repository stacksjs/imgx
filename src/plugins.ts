import type { Plugin } from 'vite'
import type { Compiler } from 'webpack'
import type { ProcessOptions } from './types'
import { Buffer } from 'node:buffer'
import { process } from './core'
import { debugLog } from './utils'

interface ImgxPluginOptions extends ProcessOptions {
  include?: string[]
  exclude?: string[]
  disabled?: boolean
}

// Vite plugin
export function viteImgxPlugin(options: ImgxPluginOptions = {}): Plugin {
  const {
    include = ['**/*.{jpg,jpeg,png,webp,avif,svg}'],
    exclude = ['node_modules/**'],
    disabled = process.env.NODE_ENV === 'development',
    ...processOptions
  } = options

  if (disabled) {
    return {
      name: 'vite-plugin-imgx',
      apply: 'build',
    }
  }

  return {
    name: 'vite-plugin-imgx',
    apply: 'build',
    async transform(code, id) {
      if (!id.match(/\.(jpg|jpeg|png|webp|avif|svg)$/i))
        return null

      // Check include/exclude patterns
      const shouldInclude = include.some(pattern => id.match(new RegExp(pattern)))
      const shouldExclude = exclude.some(pattern => id.match(new RegExp(pattern)))

      if (!shouldInclude || shouldExclude)
        return null

      try {
        debugLog('vite', `Processing ${id}`)

        const result = await process({
          ...processOptions,
          input: id,
        })

        return {
          code: `export default ${JSON.stringify(result.outputPath)}`,
          map: null,
        }
      }
      catch (error) {
        debugLog('error', `Failed to process ${id}: ${error.message}`)
        return null
      }
    },
  }
}

// Webpack plugin
export class WebpackImgxPlugin {
  private options: ImgxPluginOptions

  constructor(options: ImgxPluginOptions = {}) {
    this.options = {
      include: ['**/*.{jpg,jpeg,png,webp,avif,svg}'],
      exclude: ['node_modules/**'],
      disabled: process.env.NODE_ENV === 'development',
      ...options,
    }
  }

  apply(compiler: Compiler) {
    if (this.options.disabled)
      return

    const { include, exclude, ...processOptions } = this.options

    compiler.hooks.emit.tapAsync('WebpackImgxPlugin', async (compilation, callback) => {
      const assets = compilation.assets
      const promises = []

      for (const filename in assets) {
        const shouldInclude = include.some(pattern => filename.match(new RegExp(pattern)))
        const shouldExclude = exclude.some(pattern => filename.match(new RegExp(pattern)))

        if (!shouldInclude || shouldExclude)
          continue

        const source = assets[filename].source()

        try {
          debugLog('webpack', `Processing ${filename}`)

          const result = await process({
            ...processOptions,
            input: Buffer.from(source),
            isSvg: filename.endsWith('.svg'),
          })

          compilation.assets[filename] = {
            source: () => result.outputBuffer,
            size: () => result.outputSize,
          }
        }
        catch (error) {
          debugLog('error', `Failed to process ${filename}: ${error.message}`)
        }
      }

      await Promise.all(promises)
      callback()
    })
  }
}
