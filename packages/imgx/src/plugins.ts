import type { BunPlugin, OnLoadResult } from 'bun'
import type { Plugin } from 'vite'
import type { OptimizeResult, ProcessOptions } from './types'
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
    disabled = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
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
    async transform(code: string, id: string) {
      if (!id.match(/\.(jpe?g|png|webp|avif|svg)$/))
        return null

      try {
        // Filter files based on include/exclude patterns
        const matchesInclude = include.some(pattern => id.match(new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))))
        const matchesExclude = exclude.some(pattern => id.match(new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))))

        if (!matchesInclude || matchesExclude) {
          return null
        }

        const result = await processImage({
          ...processOptions,
          input: id,
        })

        debugLog('vite-plugin', `Processed ${id}: saved ${result.saved} bytes (${result.savedPercentage.toFixed(2)}%)`)

        if (result.saved > 0) {
          return {
            code,
            map: null,
          }
        }
      }
      catch (error) {
        console.error(`[imgx] Error processing ${id}:`, error)
      }

      return null
    },
  }
}

// Bun plugin
export function bunImgxPlugin(options: ImgxPluginOptions = {}): BunPlugin {
  const {
    include = ['**/*.{jpg,jpeg,png,webp,avif,svg}'],
    exclude = ['node_modules/**'],
    disabled = false,
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
      build.onLoad({ filter: /\.(jpe?g|png|webp|avif|svg)$/ }, async (args) => {
        try {
          // Filter files based on include/exclude patterns
          const matchesInclude = include.some(pattern =>
            args.path.match(new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))),
          )
          const matchesExclude = exclude.some(pattern =>
            args.path.match(new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))),
          )

          if (!matchesInclude || matchesExclude) {
            return null as unknown as OnLoadResult
          }

          const result = await processImage({
            ...processOptions,
            input: args.path,
          })

          debugLog('bun-plugin', `Processed ${args.path}: saved ${result.saved} bytes (${result.savedPercentage.toFixed(2)}%)`)

          // Return the file contents as is - optimization happens in place
          return {
            contents: await Bun.file(args.path).arrayBuffer(),
            loader: 'file',
          } as OnLoadResult
        }
        catch (error) {
          console.error(`[imgx] Error processing ${args.path}:`, error)
          return null as unknown as OnLoadResult
        }
      })
    },
  }
}
