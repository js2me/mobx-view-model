import { defineDocsVitepressConfig } from "sborshik/vitepress";
import { ConfigsManager } from "sborshik/utils/configs-manager";
import { REACT_LOGO_SVG } from "./shared/react-logo-svg";

const configs = ConfigsManager.create('../packages/core');

/** React logo + comma before label (errors / warnings related to React integration) */
function reactPrefixedSidebarItem(rest: string) {
  return `<span class="vp-sidebar-error-react-item"><span class="vp-sidebar-error-react-lead">${REACT_LOGO_SVG}</span> ${rest}</span>`;
}

export default defineDocsVitepressConfig(configs, {
  createdYear: '2024',
  themeConfig: {
    nav: [
      { text: 'LLM', 'link': `https://${configs.package.author}.github.io/${configs.package.name}/llms-full.txt` },
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
        text: `<span class="vp-sidebar-react-heading">React ${REACT_LOGO_SVG}</span>`,
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
          { text: 'Vite plugin', link: '/other/vite-plugin' },
        ],
      },
      {
        text: 'Errors 🚨',
        link: '/errors/1',
        items: [
          {
            text: reactPrefixedSidebarItem('#1: Active ViewModel not found'),
            link: '/errors/1',
          },
          {
            text: reactPrefixedSidebarItem('#2: ViewModel not found'),
            link: '/errors/2',
          },
          {
            text: reactPrefixedSidebarItem('#3: No access to ViewModelStore'),
            link: '/errors/3',
          },
        ]
      },
      {
        text: 'Warnings ⚠️',
        link: '/warnings/1',
        items: [
          {
            text: reactPrefixedSidebarItem('#1: ViewModelStore not found'),
            link: '/warnings/1',
          },
          {
            text: '#2: async mount() during SSR',
            link: '/warnings/2',
          },
        ]
      }
    ],
  },
});
