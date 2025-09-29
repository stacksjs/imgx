import { Logger } from '@stacksjs/clarity'
import { dts } from 'bun-plugin-dtsx'

const logger = new Logger('imgx', {
  showTags: false,
})

logger.info('Building...')

await Bun.build({
  entrypoints: ['./src/index.ts', './bin/cli.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'bun',
  minify: true,
  splitting: true,
  plugins: [dts()],
})

logger.success('Built')
