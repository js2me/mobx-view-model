import { defineConfig } from 'vitepress';

import path from 'path';
import fs from 'fs';

const { version, name: packageName, author, license } = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../package.json'),
    { encoding: 'utf-8' },
  ),
);

export default defineConfig({
  title: packageName.replace(/-/g, ' '),
  description: `${packageName.replace(/-/g, ' ')} documentation`,
  base: `/${packageName}/`,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: `/${packageName}/logo.png` }],
  ],
  themeConfig: {
    logo: '/logo.png',
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/introduction/getting-started' },
      {
        text: `v${version}`,
        items: [
          {
            items: [
              {
                text: `v${version}`,
                link: `https://github.com/${author}/${packageName}/releases/tag/v${version}`,
              },
            ],
          },
        ],
      },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting started', link: '/introduction/getting-started' },
        ],
      },
      {
        text: 'Core API',
        items: [
          { text: 'Route', link: '/core/Route' },
          { text: 'Router', link: '/core/Router' },
          { text: 'RouteGroup', link: '/core/RouteGroup' },
          { text: 'VirtualRoute', link: '/core/VirtualRoute' },
          { text: 'routeConfig', link: '/core/routeConfig' },
        ],
      },
      {
        text: 'React',
        items: [
          { text: 'Link', link: '/react/Link' },
          { text: 'RouteView', link: '/react/RouteView' },
        ],
      },
      {
        text: 'view-model',
        items: [
          { text: 'RouteViewModel', link: '/view-model/RouteViewModel' },
        ],
      },
    ],

    footer: {
      message: `Released under the ${license} License.`,
      copyright: `Copyright © 2025-PRESENT ${author}`,
    },

    socialLinks: [
      { icon: 'github', link: `https://github.com/${author}/${packageName}` },
    ],
  },
});
