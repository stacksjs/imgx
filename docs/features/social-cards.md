# Social Cards

A link preview is the only part of a page most people ever see. `ts-images`
composes the card that appears in it — background, brand, headline, product
shot — without a browser in the pipeline.

## Why more than one size

Open Graph declares one image, and scrapers disagree about the slot they put it
in. A 1.91:1 card is right for Facebook, LinkedIn, Slack and Discord. Apple's
link previews in Messages reserve a taller box and letterbox a wide card into
it, leaving dead space above and below. Pinterest wants taller still.

`generateSocialCards` builds one definition at several sizes so a page can
declare the wide card as its primary `og:image` and offer the others as
alternates:

```ts
import { generateSocialCards, loadFont, parseColor } from 'ts-images'
import { readFile } from 'node:fs/promises'

const titleFont = loadFont(new Uint8Array(await readFile('fonts/Inter-Bold.ttf')))

const cards = await generateSocialCards('public/social', {
  name: 'og',
  title: 'Ads gone before the page loads.',
  eyebrow: 'Chrome · Firefox · Safari',
  subtitle: 'No account, no telemetry, no bloat.',
  brand: 'Very Good AdBlock',
  titleFont,
  presets: ['og', 'square', 'portrait'],
})
// → { og: 'public/social/og.jpg',
//     square: 'public/social/og-square.jpg',
//     portrait: 'public/social/og-portrait.jpg' }
```

The `og` preset keeps the bare `<name>.<ext>` filename so the primary card's URL
stays stable as the set grows.

### Presets

| Preset | Size | Where it lands |
| --- | --- | --- |
| `og` | 1200×630 | Open Graph default: Facebook, LinkedIn, Slack, Discord |
| `twitter` | 1200×600 | X, `summary_large_image` |
| `square` | 1200×1200 | Square slots, no crop |
| `portrait` | 1200×1500 | Messages, Pinterest |

## Layout

The card lays out from the foot up, so a two-line and a three-line headline sit
on the same baseline. Where the shot goes depends on the card's shape: wider
than 1.2:1 puts it beside the copy, anything squarer stacks it above.

```ts
await generateSocialCard('public/og.jpg', {
  title: 'Every block, counted.',
  brand: 'Very Good AdBlock',
  titleFont,
  bodyFont,
  surface: {
    color: parseColor('#120b0c'),
    gradient: { angle: 165, stops: [
      { offset: 0, color: parseColor('#120b0c') },
      { offset: 1, color: parseColor('#1e1214') },
    ] },
    glows: [{ x: 0.84, y: 0.08, radius: 0.62, color: parseColor('#ef444438') }],
  },
  foreground: {
    image: 'captures/popup.png',
    borderColor: parseColor('#ffffff14'),
    shadow: {},
  },
})
```

`surface` supersedes the older `background` (a photograph) and
`backgroundColor` options, and takes the same shape a store screenshot's
background does — so a site and an App Store listing can share one palette.

## Meta tags

Generating the images is half of it. Declare the dimensions too, or a scraper
that cannot fetch the image has nothing to reserve space with:

```html
<meta property="og:image" content="https://example.com/social/og.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Ads gone before the page loads.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://example.com/social/og.jpg">
```

`twitter:card` must be `summary_large_image`; the default `summary` renders a
small square thumbnail no matter how good the card is.

## Cropping from photographs

`generateSocialImages` is the simpler tool: it cover-crops one source image to
each network's dimensions and writes no text.

```ts
import { generateSocialImages } from 'ts-images'

await generateSocialImages('hero.jpg', 'public/social', {
  networks: ['og-facebook', 'og-twitter'],
})
```

Use it when the source is already a designed card. Use `generateSocialCards`
when the card should say what the page is.
