<p align="center"><img src="https://github.com/stacksjs/imgx/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# imgx

> A better save for web developers.

## Features

- Image Optimizations & Manipulations
- Lossy & Lossless Minification
- Support for Responsive Images
- WebP, AVIF, JPEG-XR, and JPEG 2000
- Image Placeholder Generation _(via thumbhash)_
- OG Image Generation
- Ensures Privacy
- Web Optimized by default
- Simple, lightweight CLI & Library

## Install

```bash
bun install -d @stacksjs/imgx
```

<!-- _Alternatively, you can install:_

```bash
brew install imgx # wip
pkgx install imgx # wip
``` -->

## Get Started

There are two ways of using this tool: _as a library or as a CLI._

### Library

Given the npm package is installed:

```ts
// wip
```

### CLI

```bash
imgx wip
imgx --help
imgx --version
```

## Configuration

The Reverse Proxy can be configured using a `imgx.config.ts` _(or `imgx.config.js`)_ file and it will be automatically loaded when running the `reverse-proxy` command.

```ts
// imgx.config.{ts,js}
import type { ImgxOptions } from '@stacksjs/imgx'

const config: ImgxOptions = {
  verbose: true,
}

export default config
```

_Then run:_

```bash
./imgx start
```

To learn more, head over to the [documentation](https://reverse-proxy.sh/).

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stacksjs/stacks/releases) page for more information on what has changed recently.

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/stacks/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

Two things are true: Stacks OSS will always stay open-source, and we do love to receive postcards from wherever Stacks is used! 🌍 _We also publish them on our website. And thank you, Spatie_

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## Credits

- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/stacks/tree/main/LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@stacksjs/imgx?style=flat-square
[npm-version-href]: https://npmjs.com/package/@stacksjs/imgx
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/imgx/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/imgx/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/imgx/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/imgx -->
