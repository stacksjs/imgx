import type { ProcessOptions } from 'ts-images'
import type { BunPlugin, OnLoadResult } from 'bun'
import { debugLog, process as processImage } from 'ts-images'

export interface ImgxPluginOptions extends Partial<ProcessOptions> {
  include?: string[]
  exclude?: string[]
  disabled?: boolean
}

/**
 * Bun plugin for optimizing images using imgx
 *
 * @param options Configuration options
 * @returns Bun plugin instance
 */
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

// Default export
export default bunImgxPlugin
