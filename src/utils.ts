import { config } from './config'

export function debugLog(category: string, message: string, verbose?: boolean | string[]): void {
  if (verbose === false) {
    return
  }

  if (verbose === true || config.verbose === true) {
    // eslint-disable-next-line no-console
    console.debug(`[imgx:${category}] ${message}`)
  }

  if (Array.isArray(verbose)) {
    // Check if any of the verbose categories match the prefix
    const matches = verbose.some(prefix => category.startsWith(prefix))
    if (matches) {
      // eslint-disable-next-line no-console
      console.log(`[imgx:${category}] ${message}`)
    }
  }

  if (Array.isArray(config.verbose)) {
    // Check if any of the verbose categories match the prefix
    const matches = config.verbose.some(prefix => category.startsWith(prefix))
    if (matches) {
      // eslint-disable-next-line no-console
      console.log(`[imgx:${category}] ${message}`)
    }
  }
}
