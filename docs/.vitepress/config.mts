import { defineDocsVitepressConfig } from "sborshik/vitepress";
import { ConfigsManager } from "sborshik/utils/configs-manager";

const configs = ConfigsManager.create('../'); 

export default defineDocsVitepressConfig(configs, {
  createdYear: '2024',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/introduction/overview' },
      { text: 'Changelog', link: `https://github.com/${configs.package.author}/${configs.package.name}/releases` },
      {
        text: `${configs.package.version}`,
        items: [
          {
            items: [
              {
                text: `${configs.package.version}`,
                link: `https://github.com/${configs.package.author}/${configs.package.name}/releases/tag/${configs.package.version}`,
              },
            ],
          },
        ],
      },
    ],
    sidebar: [
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
        text: 'React ✨',
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
              },
              {
                text: 'OnlyViewModel',
                link: '/react/api/only-view-model',
              }
            ]
          },
        ],
      },
      {
        text: 'Recipes 📃',
        link: '/recipes/observer-wrap-all-view-components',
        items: [
          { text: 'Wrap in observer() all view components', link: '/recipes/observer-wrap-all-view-components' },
          { text: 'Wrap view components in custom HOC', link: '/recipes/wrap-view-components-in-custom-hoc' },
          { text: 'Integration with RootStore', link: '/recipes/integration-with-root-store' },
        ]
      },
      {
        text: 'Other 🛸',
        link: '/other/project-examples',
        items: [
          { text: 'Project examples', link: '/other/project-examples' },
          { text: 'Dependent packages', link: '/other/dependent-packages' },
          { text: 'Vite plugin', link: '/other/vite-plugin' },
        ],
      },
      {
        text: 'Errors 🚨',
        link: '/errors/1',
        items: [
          {
            text: '#1: Active ViewModel not found',
            link: '/errors/1',
          },
          {
            text: '#2: ViewModel not found',
            link: '/errors/2',
          },
          {
            text: '#3: No access to ViewModelStore',
            link: '/errors/3',
          }
        ]
      },
      {
        text: 'Warnings ⚠️',
        link: '/warnings/1',
        items: [
          {
            text: '#1: ViewModelStore not found',
            link: '/warnings/1',
          },
        ]
      }
    ],
  },
});
