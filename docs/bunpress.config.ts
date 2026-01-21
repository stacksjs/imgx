import type { BunPressConfig } from 'bunpress'

const config: BunPressConfig = {
  name: 'imgx',
  description: 'A powerful image optimization toolkit for modern web development',
  url: 'https://imgx.sh',

  nav: [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'Formats', link: '/guide/formats' },
    { text: 'Optimization', link: '/guide/optimization' },
    { text: 'GitHub', link: 'https://github.com/stacksjs/imgx' },
  ],

  sidebar: {
    '/guide/': [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/intro' },
          { text: 'Installation', link: '/install' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Format Conversion', link: '/guide/formats' },
          { text: 'Optimization', link: '/guide/optimization' },
          { text: 'Configuration', link: '/config' },
        ],
      },
    ],
    '/features/': [
      {
        text: 'Features',
        items: [
          { text: 'Format Conversion', link: '/features/conversion' },
          { text: 'Compression', link: '/features/compression' },
          { text: 'Resizing', link: '/features/resizing' },
          { text: 'Batch Processing', link: '/features/batch' },
        ],
      },
    ],
    '/advanced/': [
      {
        text: 'Advanced',
        items: [
          { text: 'Configuration', link: '/advanced/configuration' },
          { text: 'Custom Pipelines', link: '/advanced/pipelines' },
          { text: 'Performance', link: '/advanced/performance' },
          { text: 'CI/CD Integration', link: '/advanced/ci-cd' },
        ],
      },
    ],
  },

  themeConfig: {
    colors: {
      primary: '#8b5cf6',
    },
  },
}

export default config
