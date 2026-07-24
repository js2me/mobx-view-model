import type { DocusiteConfig } from 'docusite';

export default {
  nav: [
    { text: 'Home', link: '/v9' },
    { text: 'Introduction', link: '/v9/introduction/overview' },
  ],
  sidebar: [
  {
    text: 'Introduction 👋',
    link: '/v9/introduction/overview',
    items: [
      {
        text: 'Overview',
        link: '/v9/introduction/overview'
      },
      {
        text: 'Getting started',
        link: '/v9/introduction/getting-started'
      },
      {
        text: 'Decorators',
        link: '/v9/introduction/decorators'
      },
      {
        text: 'Usage',
        link: '/v9/introduction/usage/simple',
        items: [
          {
            text: 'Simple usage',
            link: '/v9/introduction/usage/simple'
          },
          {
            text: 'With base implementation',
            link: '/v9/introduction/usage/with-base-implementation'
          },
          {
            text: 'With View Model Store',
            link: '/v9/introduction/usage/with-view-model-store'
          },
          {
            text: 'Detailed configuration',
            link: '/v9/introduction/usage/detailed-configuration'
          }
        ]
      },
      {
        text: 'Playground',
        link: '/v9/introduction/playground'
      }
    ]
  },
  {
    text: 'Core API ⚙️',
    link: '/v9/api/view-models/overview',
    items: [
      {
        text: 'View Models',
        link: '/v9/api/view-models/overview',
        items: [
          {
            text: 'Overview',
            link: '/v9/api/view-models/overview'
          },
          {
            text: 'Interface',
            link: '/v9/api/view-models/interface'
          },
          {
            text: 'ViewModelBase',
            link: '/v9/api/view-models/base-implementation'
          },
          {
            text: 'ViewModelSimple',
            link: '/v9/api/view-models/view-model-simple'
          },
          {
            text: 'viewModelsConfig',
            link: '/v9/api/view-models/view-models-config'
          }
        ]
      },
      {
        text: 'View Model Store',
        link: '/v9/api/view-model-store/overview',
        items: [
          {
            text: 'Overview',
            link: '/v9/api/view-model-store/overview'
          },
          {
            text: 'Interface',
            link: '/v9/api/view-model-store/interface'
          },
          {
            text: 'ViewModelStoreBase',
            link: '/v9/api/view-model-store/base-implementation'
          }
        ]
      },
      {
        text: 'Other',
        link: '/v9/api/other/view-model-lookup',
        items: [
          {
            text: 'ViewModelLookup',
            link: '/v9/api/other/view-model-lookup'
          }
        ]
      }
    ]
  },
  {
    text: 'React <ReactMark />',
    link: '/v9/react/integration',
    items: [
      {
        text: 'Integration',
        link: '/v9/react/integration'
      },
      {
        text: 'SSR',
        link: '/v9/react/ssr'
      },
      {
        text: 'API',
        link: '/v9/react/api/with-view-model',
        items: [
          {
            text: 'withViewModel',
            link: '/v9/react/api/with-view-model'
          },
          {
            text: 'ViewModelsProvider',
            link: '/v9/react/api/view-models-provider'
          },
          {
            text: 'useViewModel',
            link: '/v9/react/api/use-view-model'
          },
          {
            text: 'useCreateViewModel',
            link: '/v9/react/api/use-create-view-model'
          },
          {
            text: 'OnlyViewModel',
            link: '/v9/react/api/only-view-model'
          }
        ]
      },
      {
        text: 'Recipes 📜',
        link: '/v9/recipes/all-props-as-payload',
        items: [
          {
            text: 'All props as payload',
            link: '/v9/recipes/all-props-as-payload'
          },
          {
            text: 'Connect other components to VMComponent',
            link: '/v9/recipes/connect-components-to-vm-component'
          },
          {
            text: 'Generic ViewModel types in React',
            link: '/v9/recipes/generic-view-models-in-react'
          },
          {
            text: 'Wrap in observer() all view components',
            link: '/v9/recipes/observer-wrap-all-view-components'
          },
          {
            text: 'Wrap view components in custom HOC',
            link: '/v9/recipes/wrap-view-components-in-custom-hoc'
          },
          {
            text: 'Integration with RootStore',
            link: '/v9/recipes/integration-with-root-store'
          }
        ]
      }
    ]
  },
  {
    text: 'Other 🛸',
    link: '/v9/other/project-examples',
    items: [
      {
        text: 'Project examples',
        link: '/v9/other/project-examples'
      },
      {
        text: 'Dependent packages',
        link: '/v9/other/dependent-packages'
      },
      {
        text: 'Vite plugin',
        link: '/v9/other/vite-plugin'
      }
    ]
  },
  {
    text: 'Errors 🚨',
    link: '/v9/errors/1',
    items: [
      {
        text: '<ReactMark /> #1: Active ViewModel not found',
        link: '/v9/errors/1'
      },
      {
        text: '<ReactMark /> #2: ViewModel not found',
        link: '/v9/errors/2'
      },
      {
        text: '<ReactMark /> #3: No access to ViewModelStore',
        link: '/v9/errors/3'
      }
    ]
  },
  {
    text: 'Warnings ⚠️',
    link: '/v9/warnings/1',
    items: [
      {
        text: '<ReactMark /> #1: ViewModelStore not found',
        link: '/v9/warnings/1'
      }
    ]
  }
],
} satisfies DocusiteConfig;
