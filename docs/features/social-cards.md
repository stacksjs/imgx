# Social Cards

A link preview is the only part of a page most people ever see. `ts-images`
composes the card that appears in it — background, brand, headline, product
shot — without a browser in the pipeline.

## Declare one `og:image`

**Repeated `og:image` is a gallery, not a fallback list.** It is tempting to
publish a wide card plus a square and a portrait crop and let each consumer
pick the shape that suits its slot. They do not pick. Discord lays every
declared image out side by side, each cropped to a sliver, and what was meant
as a graceful fallback renders as a worse preview than the single card would
have. Facebook and Apple take the first and ignore the rest, so the extras buy
nothing even where they do no harm.

Generate one card at 1.91:1 and declare that. It is the ratio Facebook,
LinkedIn, Slack and Discord all draw whole, and the one Apple letterboxes into
its taller box rather than mangling.

## More than one size

The other presets are for the places you reference an image *directly* — an
`<img>` in a page, an emailer, a social post you compose yourself — not for
stacking into `og:image`:

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
//
// Only `og` belongs in a meta tag. Reference the others by URL where you
// actually want that shape.
```

The `og` preset keeps the bare `<name>.<ext>` filename so the primary card's URL
stays stable as the set grows.

### Presets

| Preset | Size | Where it lands |
| --- | --- | --- |
| `og` | 1200×630 | The one you declare as `og:image` — Facebook, LinkedIn, Slack, Discord, Messages |
| `twitter` | 1200×600 | `twitter:image`, if you want X's exact ratio rather than reusing `og` |
| `square` | 1200×1200 | Square slots you reference directly |
| `portrait` | 1200×1500 | Tall slots you reference directly, e.g. a Pinterest pin |

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

### Copy that is longer than the space

A card quotes a page, and a page's headline is not written to fit a card. Both
the headline and the supporting line wrap, and both mark the cut when they run
out of room:

```ts
await generateSocialCard('public/og.jpg', {
  title: 'How to maintain muscle while using GLP-1 weight loss medications',
  subtitle: 'Pool, tennis, squash, strength, recovery, and coaching.',
  titleLines: 3, // default
  subtitleLines: 2, // default; 1 restores the old single-line behaviour
  titleFont,
  bodyFont,
})
```

The subtitle reserves the height it actually needs, so wrapping it pushes the
headline up rather than colliding with it. Anything still too long is
ellipsised — which matters more than it sounds, because a headline cut without
a mark reads as a complete, shorter headline rather than a truncated one, and
nobody reviewing the card notices.

`layoutText` and `drawText` take the same `ellipsis` flag, off by default so
existing layouts keep the metrics they were built against.

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

Note the single `og:image`. Adding the square and portrait crops here is the
mistake described above — Discord will collage them.

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
