import type { Buffer } from 'node:buffer'

export interface ImgxConfig {
  verbose: boolean | string[]
  cache: boolean
  cacheDir: string
  concurrent: number
  skipOptimized: boolean
}

export type ImgxOptions = Partial<ImgxConfig>

export interface ImageOptions {
  quality?: number
  resize?: string | { width?: number, height?: number }
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  progressive?: boolean
  preserveMetadata?: boolean
}

export interface SvgOptions {
  cleanup?: boolean
  prettify?: boolean
  removeComments?: boolean
  removeDimensions?: boolean
  removeViewBox?: boolean
}

export interface OptimizeResult {
  inputPath: string
  outputPath: string
  inputSize: number
  outputSize: number
  saved: number
  savedPercentage: number
  error?: Error
}

export interface ProcessOptions extends ImageOptions, SvgOptions {
  input: string | Buffer
  output?: string
  isSvg?: boolean
}

export type ProcessFunction = (options: ProcessOptions) => Promise<OptimizeResult>

export interface ScanOptions {
  /**
   * The root directory to start matching from. Defaults to `process.cwd()`
   */
  cwd?: string

  /**
   * Allow patterns to match entries that begin with a period (`.`).
   *
   * @default false
   */
  dot?: boolean

  /**
   * Return the absolute path for entries.
   *
   * @default false
   */
  absolute?: boolean

  /**
   * Indicates whether to traverse descendants of symbolic link directories.
   *
   * @default false
   */
  followSymlinks?: boolean

  /**
   * Throw an error when symbolic link is broken
   *
   * @default false
   */
  throwErrorOnBrokenSymlink?: boolean

  /**
   * Return only files.
   *
   * @default true
   */
  onlyFiles?: boolean
}

export interface GetFilesOptions extends ScanOptions {
  patterns?: string[]
  ignore?: string[]
  maxDepth?: number
}
