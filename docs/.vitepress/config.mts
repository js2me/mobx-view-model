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
      { text: 'Introduction', link: '/introduction/overview' },
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
        link: '/introduction/overview',
        items: [
          { text: 'Overview', link: '/introduction/overview' },
          { text: 'Getting started', link: '/introduction/getting-started' },
          { text: 'Decorators', link: '/introduction/decorators' },
          {
            text: 'Usage',
            link: '/introduction/usage/simple',
            items: [
              {
                text: 'Simple usage',
                link: '/introduction/usage/simple',
              },
              {
                text: 'With View Model Store',
                link: '/introduction/usage/with-view-model-store',
              },
              {
                text: 'Detailed configuration',
                link: '/introduction/usage/detailed-configuration',
              }
            ]
          },
        ],
      },
      {
        text: 'Core API',
        link: '/api/view-models/overview',
        items: [
          {
            text: 'View Models',
            link: '/api/view-models/overview',
            items: [
              {
                text: "Overview",
                link: '/api/view-models/overview',
              },
              {
                text: "Interface",
                link: '/api/view-models/interface',
              },
              {
                text: "Base Implementation",
                link: '/api/view-models/base-implementation',
              },
              {
                text: "View Models Config",
                link: '/api/view-models/view-models-config',
              },
            ]
          },  
          {
            text: 'View Model Store',
            link: '/api/view-model-store/overview',
            items: [
              {
                text: "Overview",
                link: '/api/view-model-store/overview',
              },
              {
                text: "Interface",
                link: '/api/view-model-store/interface',
              },
              {
                text: "Base Implementation",
                link: '/api/view-model-store/base-implementation',
              },
            ]
          },  
          {
            text: 'Other',
            link: '/api/other/view-model-lookup',
            items: [
              {
                text: "ViewModelLookup",
                link: '/api/other/view-model-lookup',
              },
            ]
          },
        ],
      },
      {
        text: 'React',
        link: '/react/integration',
        items: [
          {
            text: 'Integration',
            link: '/react/integration',
          },
          {
            text: 'SSR',
            link: '/react/ssr',
          },
          {
            text: 'API',
            link: '/react/api/with-view-model',
            items: [
              {
                text: 'withViewModel',
                link: '/react/api/with-view-model',
              },
              {
                text: 'ViewModelsProvider',
                link: '/react/api/view-models-provider',
              },
              {
                text: 'useViewModel',
                link: '/react/api/use-view-model',
              },
              {
                text: 'useCreateViewModel',
                link: '/react/api/use-create-view-model',
              },
              {
                text: 'withLazyViewModel',
                link: '/react/api/with-lazy-view-model',
              }
            ]
          }
        ],
      },
      {
        text: 'Other',
        link: '/other/project-examples',
        items: [
          { text: 'Project examples', link: '/other/project-examples' },
          { text: 'Dependent packages', link: '/other/dependent-packages' },
        ],
      }
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
