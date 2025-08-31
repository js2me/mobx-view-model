import { createGlobalConfig } from 'yummies/complex';

import type { ViewModelsConfig } from './types.js';
import { mergeVMConfigs } from './utils/merge-vm-configs.js';

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
  factory: (config) => {
    const VM = config.VM;
    return new VM({
      ...config,
      vmConfig: mergeVMConfigs(config.config ?? config.vmConfig),
    });
  },
});
