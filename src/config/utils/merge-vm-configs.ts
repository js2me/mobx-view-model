import type { Maybe } from 'yummies/types';

import { viewModelsConfig as globalConfig } from '../global-config.js';
import type { ViewModelsConfig, ViewModelsRawConfig } from '../types.js';

/**
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
 */
export const mergeVMConfigs = (...configs: Maybe<ViewModelsRawConfig>[]) => {
  const result: ViewModelsConfig = {
    ...globalConfig,
    startViewTransitions: structuredClone(globalConfig.startViewTransitions),
    observable: {
      viewModels: {
        ...globalConfig.observable.viewModels,
      },
      viewModelStores: {
        ...globalConfig.observable.viewModelStores,
      },
    },
  };

  configs.forEach((config) => {
    if (!config) {
      return;
    }

    const {
      startViewTransitions,
      comparePayload,
      observable,
      generateId,
      ...otherConfigUpdates
    } = config;

    if (generateId) {
      result.generateId = generateId;
    }
    if (startViewTransitions) {
      const startViewTransitonsUpdate: Partial<
        ViewModelsConfig['startViewTransitions']
      > =
        typeof startViewTransitions === 'boolean'
          ? ({
              mount: startViewTransitions,
              payloadChange: startViewTransitions,
              unmount: startViewTransitions,
            } satisfies ViewModelsConfig['startViewTransitions'])
          : startViewTransitions;

      Object.assign(result.startViewTransitions, startViewTransitonsUpdate);
    }
    if (observable?.viewModels) {
      Object.assign(result.observable.viewModels, observable.viewModels || {});
    }
    if (observable?.viewModelStores) {
      Object.assign(
        result.observable.viewModelStores,
        observable.viewModelStores || {},
      );
    }

    if (comparePayload != null) {
      result.comparePayload = comparePayload;
    }

    Object.assign(result, otherConfigUpdates);
  });

  return result;
};
