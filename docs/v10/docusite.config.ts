import type { DocusiteConfig } from 'docusite';

export default {
  nav: [
    { text: 'Home', link: '/v10' },
    { text: 'Introduction', link: '/v10/introduction/overview' },
  ],
  sidebar: [
  {
    text: 'Introduction 👋',
    link: '/v10/introduction/overview',
    items: [
      {
        text: 'Overview',
        link: '/v10/introduction/overview'
      },
      {
        text: 'Getting started',
        link: '/v10/introduction/getting-started'
      },
      {
        text: 'Decorators',
        link: '/v10/introduction/decorators'
      },
      {
        text: 'Usage',
        link: '/v10/introduction/usage/simple',
        items: [
          {
            text: 'Simple usage',
            link: '/v10/introduction/usage/simple'
          },
          {
            text: 'With base implementation',
            link: '/v10/introduction/usage/with-base-implementation'
          },
          {
            text: 'With View Model Store',
            link: '/v10/introduction/usage/with-view-model-store'
          },
          {
            text: 'Detailed configuration',
            link: '/v10/introduction/usage/detailed-configuration'
          }
        ]
      },
      {
        text: 'Playground',
        link: '/v10/introduction/playground'
      }
    ]
  },
  {
    text: 'Core API ⚙️',
    link: '/v10/api/view-models/overview',
    items: [
      {
        text: 'View Models',
        link: '/v10/api/view-models/overview',
        items: [
          {
            text: 'Overview',
            link: '/v10/api/view-models/overview'
          },
          {
            text: 'Interface',
            link: '/v10/api/view-models/interface'
          },
          {
            text: 'ViewModelBase',
            link: '/v10/api/view-models/base-implementation'
          },
          {
            text: 'ViewModelSimple',
            link: '/v10/api/view-models/view-model-simple'
          },
          {
            text: 'viewModelsConfig',
            link: '/v10/api/view-models/view-models-config'
          }
        ]
      },
      {
        text: 'View Model Store',
        link: '/v10/api/view-model-store/overview',
        items: [
          {
            text: 'Overview',
            link: '/v10/api/view-model-store/overview'
          },
          {
            text: 'Interface',
            link: '/v10/api/view-model-store/interface'
          },
          {
            text: 'ViewModelStoreBase',
            link: '/v10/api/view-model-store/base-implementation'
          }
        ]
      },
      {
        text: 'Other',
        link: '/v10/api/other/view-model-lookup',
        items: [
          {
            text: 'ViewModelLookup',
            link: '/v10/api/other/view-model-lookup'
          }
        ]
      }
    ]
  },
  {
    text: 'React <ReactMark />',
    link: '/v10/react/integration',
    items: [
      {
        text: 'Integration',
        link: '/v10/react/integration'
      },
      {
        text: 'SSR',
        link: '/v10/react/ssr'
      },
      {
        text: 'API',
        link: '/v10/react/api/with-view-model',
        items: [
          {
            text: 'withViewModel',
            link: '/v10/react/api/with-view-model'
          },
          {
            text: 'withPropsViewModel',
            link: '/v10/react/api/with-props-view-model'
          },
          {
            text: 'ViewModelsProvider',
            link: '/v10/react/api/view-models-provider'
          },
          {
            text: 'useViewModel',
            link: '/v10/react/api/use-view-model'
          },
          {
            text: 'useCreateViewModel',
            link: '/v10/react/api/use-create-view-model'
          },
          {
            text: 'OnlyViewModel',
            link: '/v10/react/api/only-view-model'
          }
        ]
      },
      {
        text: 'Recipes 📜',
        link: '/v10/recipes/all-props-as-payload',
        items: [
          {
            text: 'All props as payload',
            link: '/v10/recipes/all-props-as-payload'
          },
          {
            text: 'Connect other components to VMComponent',
            link: '/v10/recipes/connect-components-to-vm-component'
          },
          {
            text: 'Generic ViewModel types in React',
            link: '/v10/recipes/generic-view-models-in-react'
          },
          {
            text: 'Wrap in observer() all view components',
            link: '/v10/recipes/observer-wrap-all-view-components'
          },
          {
            text: 'Wrap view components in custom HOC',
            link: '/v10/recipes/wrap-view-components-in-custom-hoc'
          },
          {
            text: 'Integration with RootStore',
            link: '/v10/recipes/integration-with-root-store'
          }
        ]
      }
    ]
  },
  {
    text: 'Other 🛸',
    link: '/v10/other/project-examples',
    items: [
      {
        text: 'Project examples',
        link: '/v10/other/project-examples'
      },
      {
        text: 'Dependent packages',
        link: '/v10/other/dependent-packages'
      },
      {
        text: 'DevTools',
        link: '/v10/other/dev-tools'
      },
      {
        text: 'Vite plugin',
        link: '/v10/other/vite-plugin'
      }
    ]
  },
  {
    text: 'Errors 🚨',
    link: '/v10/errors/1',
    items: [
      {
        text: '<ReactMark /> #1: Active ViewModel not found',
        link: '/v10/errors/1'
      },
      {
        text: '<ReactMark /> #2: ViewModel not found',
        link: '/v10/errors/2'
      },
      {
        text: '<ReactMark /> #3: No access to ViewModelStore',
        link: '/v10/errors/3'
      }
    ]
  },
  {
    text: 'Warnings ⚠️',
    link: '/v10/warnings/1',
    items: [
      {
        text: '<ReactMark /> #1: ViewModelStore not found',
        link: '/v10/warnings/1'
      }
    ]
  }
],
} satisfies DocusiteConfig;
