import {defineConfig} from 'vitepress';

export default defineConfig({
  lang: 'en-US',
  title: 'tss-router',
  description: 'A type-safe, lightweight router for React applications.',
  base: '/tss-router/',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', {rel: 'icon', href: '/tss-router/favicon.ico'}]],
  themeConfig: {
    nav: [
      {text: 'Guide', link: '/guide/getting-started'},
      {text: 'API', link: '/api/'},
      {text: 'npm', link: 'https://www.npmjs.com/package/tss-route-lib'},
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            {text: 'Getting Started', link: '/guide/getting-started'},
            {text: 'Why tss-router?', link: '/guide/why'},
          ],
        },
        {
          text: 'Core concepts',
          items: [
            {text: 'Defining routes', link: '/guide/routes'},
            {text: 'Path & search params', link: '/guide/params'},
            {text: 'Groups & layouts', link: '/guide/groups'},
            {text: 'Navigation', link: '/guide/navigation'},
            {text: 'History', link: '/guide/history'},
          ],
        },
        {
          text: 'Advanced',
          items: [{text: 'Testing', link: '/guide/testing'}],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [{text: 'Overview', link: '/api/'}],
        },
      ],
    },
    socialLinks: [{icon: 'github', link: 'https://github.com/hachibeeDI/tss-router'}],
    editLink: {
      pattern: 'https://github.com/hachibeeDI/tss-router/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    search: {provider: 'local'},
    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2024-present OGURA Daiki',
    },
  },
});
