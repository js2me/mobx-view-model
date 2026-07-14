import { defineConfig } from 'docusite';

import { circularVmPayloadDependencyTestCases } from '../packages/react/src/hoc/with-view-model.test.fixture';
import { resolve } from 'path';

const pkgsRoot = resolve(import.meta.dirname, '../../packages');

export default defineConfig({
  packageJsonPath: '../packages/core',
  base: `/@{packageJson.description}/`,
  title: '@{packageJson.name}',
  description: '@{packageJson.description}',
  github: 'https://github.com/@{packageJson.author}/@{packageJson.name}',
  colors: {
    light: ['#3ba235', '#ff8a4f', '#ff6a07'],
    dark: ['#128223', '#fb681f', '#9e321a'],
  },
  logos: {
    main: '/public/logo.png',
  },
  docsDir: '.',
  runtimeScript: () => {
    import('./.internal/scripts/load-devtools').then(m => m.loadDevtools());
  },
  nav: [
    { text: 'Guide', link: '/guide/getting-started' },
  ],
  sidebar: {
    '/': [
      {
        text: 'Introduction 👋',
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
                text: 'With base implementation',
                link: '/introduction/usage/with-base-implementation',
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
          {
            text: 'Playground',
            link: '/introduction/playground',
          }
        ],
      },
      {
        text: 'Core API ⚙️',
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
                text: "ViewModelBase",
                link: '/api/view-models/base-implementation',
              },
              {
                text: "ViewModelSimple",
                link: '/api/view-models/view-model-simple',
              },
              {
                text: "viewModelsConfig",
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
                text: "ViewModelStoreBase",
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
        text: `React <ReactMark />`,
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
                text: 'withPropsViewModel',
                link: '/react/api/with-props-view-model',
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
                text: 'OnlyViewModel',
                link: '/react/api/only-view-model',
              }
            ]
          },
          {
            text: 'Recipes 📜',
            link: '/recipes/all-props-as-payload',
            items: [
              { text: 'All props as payload', link: '/recipes/all-props-as-payload' },
              { text: 'Connect other components to VMComponent', link: '/recipes/connect-components-to-vm-component' },
              { text: 'Generic ViewModel types in React', link: '/recipes/generic-view-models-in-react' },
              { text: 'Wrap in observer() all view components', link: '/recipes/observer-wrap-all-view-components' },
              { text: 'Wrap view components in custom HOC', link: '/recipes/wrap-view-components-in-custom-hoc' },
              { text: 'Integration with RootStore', link: '/recipes/integration-with-root-store' },
            ],
          },
        ],
      },
      {
        text: 'Other 🛸',
        link: '/other/project-examples',
        items: [
          { text: 'Project examples', link: '/other/project-examples' },
          { text: 'Dependent packages', link: '/other/dependent-packages' },
          { text: 'DevTools', link: '/other/dev-tools' },
          { text: 'Vite plugin', link: '/other/vite-plugin' },
        ],
      },
      {
        text: 'Errors 🚨',
        link: '/errors/1',
        items: [
          {
            text: '<ReactMark /> #1: Active ViewModel not found',
            link: '/errors/1',
          },
          {
            text: '<ReactMark /> #2: ViewModel not found',
            link: '/errors/2',
          },
          {
            text: '<ReactMark /> #3: No access to ViewModelStore',
            link: '/errors/3',
          },
        ]
      },
      {
        text: 'Warnings ⚠️',
        link: '/warnings/1',
        items: [
          {
            text: '<ReactMark /> #1: ViewModelStore not found',
            link: '/warnings/1',
          }
        ]
      }
    ]
  },
  contentInjections: [
    {
      key: 'circularVmPayloadDependencyTestCases',
      value: circularVmPayloadDependencyTestCases
        .filter(it => it.isRecursion)
        .map(it => JSON.stringify(it.vmConfig, null, 2))
        .map(it => `
    \`\`\`json
    ${it}
    \`\`\`
    `)
        .join('\n')
    }
  ],
  siteConfigOverrides: {
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        'mobx-view-model': resolve(pkgsRoot, 'core/dist/index.js'),
        'mobx-view-model-react': resolve(pkgsRoot, 'react/dist/index.js'),
        'mobx-view-model-devtools': resolve(pkgsRoot, 'devtools/dist/index.js'),
      },
    },
    ssr: {
      noExternal: ['mobx-view-model', 'mobx-view-model-react', 'mobx-view-model-devtools'],
    },
  }
})