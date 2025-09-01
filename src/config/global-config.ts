import { createGlobalConfig } from 'yummies/complex';
import { generateVmId } from '../utils/generate-vm-id.js';
import type { ViewModelsConfig } from './types.js';
import { mergeVMConfigs } from './utils/merge-vm-configs.js';

/**
 * Global configuration options for view models
 */
export const viewModelsConfig = createGlobalConfig<ViewModelsConfig>({
  comparePayload: false,
  payloadComputed: 'struct',
  payloadObservable: 'ref',
  wrapViewsInObserver: true,
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
  generateId: generateVmId,
  factory: (config) => {
    const VM = config.VM;
    return new VM({
      ...config,
      vmConfig: mergeVMConfigs(config.vmConfig),
    });
  },
});
