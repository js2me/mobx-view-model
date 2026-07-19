import { createGlobalConfig, createPubSub } from 'yummies/complex';
import type { ViewModelStore } from '../view-model/view-model.store.js';
import type { ViewModelsConfig } from './types.js';
import { mergeVMConfigs } from './utils/merge-vm-configs.js';
import { isViewModelSimpleClass } from '../utils/typeguards.js';
import { _internals } from '../internals.js';

/**
 * Global configuration options for view models
 */
export const viewModelsConfig = createGlobalConfig<ViewModelsConfig>(
  {
    mode: 'csr',
    comparePayload: false,
    payloadComputed: 'struct',
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
    getPayload: (allProps) => allProps.payload ?? _internals.emptyObject,
    fallbackComponent: _internals.noop,
    factory: (config) => {
      const VM = config.VM;

      if (isViewModelSimpleClass(VM)) {
        return new VM()
      }

      return new VM({
        ...config,
        vmConfig: mergeVMConfigs(config.vmConfig),
      });
    },
    hooks: {
      storeCreate: createPubSub<[ViewModelStore]>(),
    },
  },
  Symbol.for('VIEW_MODELS_CONFIG'),
);
