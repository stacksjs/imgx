// Guards against publishing a broken bundle: ts-images 0.1.10 shipped a dist
// that Bun's bundler tree-shook down to an export stub with no declarations
// (the package's own `sideEffects: false` made every re-exporting module look
// removable), so any consumer crashed on import — the same failure that hit
// ts-collect 0.4.1/0.4.2. This imports the built dist entry and checks the
// public API; prepublishOnly runs it so an unimportable dist can't be published.
function fail(message: string): never {
  console.error(`smoke-dist: ${message}`)
  process.exit(1)
}

const distEntry = new URL('../dist/src/index.js', import.meta.url).href
const activityCardEntry = new URL('../dist/src/activity-card.js', import.meta.url).href

let mod: Record<string, unknown>
try {
  mod = await import(distEntry)
}
catch (error) {
  fail(`dist/src/index.js failed to import: ${error instanceof Error ? error.message : error}`)
}

for (const name of ['decode', 'encode', 'getMetadata', 'resize', 'processImage', 'process', 'createImageData']) {
  if (typeof mod[name] !== 'function')
    fail(`expected dist entry to export function \`${name}\`, got ${typeof mod[name]}`)
}

const { createImageData, encode, decode } = mod as unknown as typeof import('../src/index')
const img = createImageData(4, 4)
img.data.fill(128)
const png = await encode(img, 'png', {})
if (!(png instanceof Uint8Array) || png.byteLength === 0)
  fail('encode(png) returned no bytes')
const roundTrip = await decode(png)
if (roundTrip.width !== 4 || roundTrip.height !== 4)
  fail(`decode(encode(img)) returned ${roundTrip.width}x${roundTrip.height}, expected 4x4`)

const activityCard = await import(activityCardEntry) as typeof import('../src/activity-card')
const card = activityCard.activityShareCardSvg({
  activityType: 'Trail run',
  distance: '10.4 km',
  duration: '52:18',
  route: [{ lat: 37.1, lng: -122.1 }, { lat: 37.2, lng: -122.2 }],
  title: 'Ridge loop',
})
if (!card.includes('id="activity-route"') || !card.includes('10.4 km'))
  fail('activity-card subpath did not render route and metrics')

console.log('smoke-dist: dist imports, png round-trips, and activity cards render')
