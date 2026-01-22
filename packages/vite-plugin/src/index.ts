import type { ProcessOptions } from 'ts-images'
import type { Plugin } from 'vite'
import process from 'node:process'
import { debugLog, process as processImage } from 'ts-images'

export interface ImgxPluginOptions extends Partial<ProcessOptions> {
  include?: string[]
  exclude?: string[]
  disabled?: boolean
}

/**
 * Vite plugin for optimizing images using imgx
 *
 * @param options Configuration options
 * @returns Vite plugin instance
 */
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

// Default export
export default viteImgxPlugin
