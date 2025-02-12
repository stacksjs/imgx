import { dts } from 'bun-plugin-dtsx'

console.log('Building...')

await Bun.build({
  entrypoints: ['./src/index.ts', './bin/cli.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'node',
  minify: true,
  splitting: true,
  external: ['bun'],
  plugins: [dts()],
})

console.log('Built')
