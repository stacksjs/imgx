import { Logger } from '@stacksjs/clarity'
import { dts } from 'bun-plugin-dtsx'

const logger = new Logger('imgx', {
  showTags: false,
})

async function main(): Promise<void> {
  logger.info('Building...')

  const result = await Bun.build({
    entrypoints: ['./src/index.ts', './src/activity-card.ts', './bin/cli.ts'],
    outdir: './dist',
    format: 'esm',
    target: 'bun',
    minify: true,
    splitting: true,
    plugins: [dts()],
  })

  if (!result.success) {
    for (const log of result.logs)
      logger.error(log)
    throw new Error('Build failed')
  }

  logger.success('Built')
}

main().catch((err) => {
  logger.error(err)
  process.exit(1)
})
