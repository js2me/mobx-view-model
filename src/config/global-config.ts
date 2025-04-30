import { createGlobalConfig } from 'yummies/complex';

import { ViewModelsConfig } from './types.js';

/**
 * Global configuration options for view models
 */
export const viewModelsConfig = createGlobalConfig<ViewModelsConfig>({
  comparePayload: 'strict',
  payloadObservable: 'ref',
  startViewTransitions: {
    mount: false,
    payloadChange: false,
    unmount: false,
  },
  observable: {
    viewModels: {
      useDecorators: true,
    },
    viewModelStores: {
      useDecorators: true,
    },
  },
});
