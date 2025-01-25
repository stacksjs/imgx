import type { ImgxConfig } from './types'
import { resolve } from 'node:path'
import { loadConfig } from 'bunfig'

export const defaultConfig: ImgxConfig = {
  verbose: true,
}

// @ts-expect-error dtsx issue
// eslint-disable-next-line antfu/no-top-level-await
export const config: ProxyConfig = await loadConfig({
  name: 'imgx',
  cwd: resolve(__dirname, '..'),
  defaultConfig,
})
