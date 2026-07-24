import { defineConfig } from 'docusite';

import { resolve } from 'path';
import v9docs from './v9/docusite.config';
import v10docs from './v10/docusite.config';

/** Configs that can cause infinite re-renders via circular payload access (docs injection). */
const circularVmPayloadDependencyRecursionConfigs = [
  {
    wrapViewsInObserver: true,
    payloadComputed: true,
    comparePayload: 'shallow',
    payloadObservable: 'deep',
  },
  {
    wrapViewsInObserver: true,
    payloadComputed: true,
    comparePayload: false,
    payloadObservable: 'deep',
  },
  {
    wrapViewsInObserver: true,
    payloadComputed: true,
    comparePayload: false,
    payloadObservable: 'ref',
  },
  {
    wrapViewsInObserver: true,
    payloadComputed: false,
    comparePayload: 'shallow',
    payloadObservable: 'deep',
  },
  {
    wrapViewsInObserver: true,
    payloadComputed: false,
    comparePayload: false,
    payloadObservable: 'deep',
  },
  {
    wrapViewsInObserver: true,
    payloadComputed: false,
    comparePayload: false,
    payloadObservable: 'ref',
  },
  {
    wrapViewsInObserver: false,
    payloadComputed: true,
    comparePayload: 'shallow',
    payloadObservable: 'deep',
  },
  {
    wrapViewsInObserver: false,
    payloadComputed: true,
    comparePayload: false,
    payloadObservable: 'deep',
  },
  {
    wrapViewsInObserver: false,
    payloadComputed: true,
    comparePayload: false,
    payloadObservable: 'ref',
  },
  {
    wrapViewsInObserver: false,
    payloadComputed: false,
    comparePayload: 'shallow',
    payloadObservable: 'deep',
  },
  {
    wrapViewsInObserver: false,
    payloadComputed: false,
    comparePayload: false,
    payloadObservable: 'deep',
  },
  {
    wrapViewsInObserver: false,
    payloadComputed: false,
    comparePayload: false,
    payloadObservable: 'ref',
  },
];

const pkgsRoot = resolve(import.meta.dirname, '../../packages');

export default defineConfig({
  packageJsonPath: '../packages/core',
  base: `/@{packageJson.name}/`,
  title: '@{packageJson.name}',
  description: '@{packageJson.description}',
  search: 'local',
  changelog: {
    src: '../packages/core/CHANGELOG.md',
  },
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
  versions: {
    latest: '11.x',
    older: [
      { label: 'v10.x', link: '/v10/introduction/overview' },
      { label: 'v9.x', link: '/v9/introduction/overview' },
    ],
  },
  nav: {
    '/': [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/introduction/overview' },
    ],
    '/v10/': v10docs.nav,
    '/v9/': v9docs.nav,
  },
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
              },
            ],
          },
          {
            text: 'Playground',
            link: '/introduction/playground',
          },
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
                text: 'Overview',
                link: '/api/view-models/overview',
              },
              {
                text: 'Interface',
                link: '/api/view-models/interface',
              },
              {
                text: 'ViewModelBase',
                link: '/api/view-models/base-implementation',
              },
              {
                text: 'ViewModelSimple',
                link: '/api/view-models/view-model-simple',
              },
              {
                text: 'viewModelsConfig',
                link: '/api/view-models/view-models-config',
              },
            ],
          },
          {
            text: 'View Model Store',
            link: '/api/view-model-store/overview',
            items: [
              {
                text: 'Overview',
                link: '/api/view-model-store/overview',
              },
              {
                text: 'Interface',
                link: '/api/view-model-store/interface',
              },
              {
                text: 'ViewModelStoreBase',
                link: '/api/view-model-store/base-implementation',
              },
            ],
          },
          {
            text: 'Other',
            link: '/api/other/view-model-lookup',
            items: [
              {
                text: 'ViewModelLookup',
                link: '/api/other/view-model-lookup',
              },
            ],
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
              },
            ],
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
        text: 'SolidJS',
        link: '/solid/integration',
        items: [
          {
            text: 'Integration',
            link: '/solid/integration',
          },
          {
            text: 'API',
            link: '/solid/api/with-view-model',
            items: [
              {
                text: 'withViewModel',
                link: '/solid/api/with-view-model',
              },
              {
                text: 'withPropsViewModel',
                link: '/solid/api/with-props-view-model',
              },
              {
                text: 'ViewModelsProvider',
                link: '/solid/api/view-models-provider',
              },
              {
                text: 'useViewModel',
                link: '/solid/api/use-view-model',
              },
              {
                text: 'useCreateViewModel',
                link: '/solid/api/use-create-view-model',
              },
              {
                text: 'OnlyViewModel',
                link: '/solid/api/only-view-model',
              },
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
        ],
      },
      {
        text: 'Warnings ⚠️',
        link: '/warnings/1',
        items: [
          {
            text: '<ReactMark /> #1: ViewModelStore not found',
            link: '/warnings/1',
          },
        ],
      },
    ],
    '/v10/': v10docs.sidebar,
    '/v9/': v9docs.sidebar,
  },
  contentInjections: [
    {
      key: 'circularVmPayloadDependencyTestCases',
      value: circularVmPayloadDependencyRecursionConfigs
        .map(it => JSON.stringify(it, null, 2))
        .map(it => `\n\`\`\`json\n${it}\n\`\`\`\n`)
        .join('\n'),
    },
  ],
  siteConfigOverrides: {
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        'mobx-view-model': resolve(pkgsRoot, 'core/dist/index.js'),
        'mobx-view-model-react': resolve(pkgsRoot, 'react/dist/index.js'),
        'mobx-view-model-solid': resolve(pkgsRoot, 'solid/dist/index.js'),
        'mobx-view-model-devtools': resolve(pkgsRoot, 'devtools/dist/index.js'),
      },
    },
    ssr: {
      noExternal: [
        'mobx-view-model',
        'mobx-view-model-react',
        'mobx-view-model-solid',
        'mobx-view-model-devtools',
      ],
    },
  },
});
