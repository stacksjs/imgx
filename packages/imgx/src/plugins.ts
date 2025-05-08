import type { BunPlugin, OnLoadResult } from 'bun'
import type { Plugin } from 'vite'
import type { OptimizeResult, ProcessOptions } from './types'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { process as processImage } from './core'
import { debugLog } from './utils'

interface ImgxPluginOptions extends Partial<ProcessOptions> {
  include?: string[]
  exclude?: string[]
  disabled?: boolean
}

// Vite plugin
export function viteImgxPlugin(options: ImgxPluginOptions = {}): Plugin {
  const {
    include = ['**/*.{jpg,jpeg,png,webp,avif,svg}'],
    exclude = ['node_modules/**'],
    disabled = process.env?.NODE_ENV === 'development',
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

        const result = await processImage({
          ...processOptions,
          input: id,
        })

        return {
          code: `export default ${JSON.stringify(result.outputPath)}`,
          map: null,
        }
      }
      catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        debugLog('error', `Failed to process ${id}: ${errorMessage}`)
        return null
      }
    },
  }
}

// Bun plugin
export function bunImgxPlugin(options: ImgxPluginOptions = {}): BunPlugin {
  const {
    include = ['**/*.{jpg,jpeg,png,webp,avif,svg}'],
    exclude = ['node_modules/**'],
    disabled = process.env?.NODE_ENV === 'development',
    ...processOptions
  } = options

  if (disabled) {
    return {
      name: 'bun-plugin-imgx',
      setup() {},
    }
  }

  return {
    name: 'bun-plugin-imgx',
    setup(build) {
      build.onLoad({ filter: /\.(jpg|jpeg|png|webp|avif|svg)$/i }, async (args) => {
        const id = args.path

        // Check include/exclude patterns
        const shouldInclude = include.some(pattern => id.match(new RegExp(pattern)))
        const shouldExclude = exclude.some(pattern => id.match(new RegExp(pattern)))

        if (!shouldInclude || shouldExclude)
          return null as unknown as OnLoadResult

        try {
          debugLog('bun', `Processing ${id}`)

          const result = await processImage({
            ...processOptions,
            input: id,
          })

          return {
            contents: `export default ${JSON.stringify(result.outputPath)}`,
            loader: 'js',
          }
        }
        catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          debugLog('error', `Failed to process ${id}: ${errorMessage}`)
          return null as unknown as OnLoadResult
        }
      })
    },
  }
}
