import { createPubSub } from 'yummies/complex';
import type { ViewModelStore } from '../view-model/view-model.store.js';
import type { ViewModelsConfig } from './types.js';
import { mergeVMConfigs } from './utils/merge-vm-configs.js';
import { isViewModelSimpleClass } from '../utils/typeguards.js';
import { _internals } from '../internals.js';

declare const globalThis: typeof Window & { [_internals.viewModelMarker]?: ViewModelsConfig }

globalThis[_internals.viewModelMarker] ??= {
  mode: 'csr-only',
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
}

/**
 * Global configuration options for view models
 */
export const viewModelsConfig: ViewModelsConfig = globalThis[_internals.viewModelMarker]!