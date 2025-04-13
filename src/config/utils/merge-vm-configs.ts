import { Maybe } from 'yummies/utils/types';

import { viewModelsConfig } from '../global-config.js';
import { ViewModelsConfig, ViewModelsRawConfig } from '../types.js';

export const mergeVMConfigs = (...configs: Maybe<ViewModelsRawConfig>[]) => {
  const result: ViewModelsConfig = {
    ...viewModelsConfig,
    startViewTransitions: structuredClone(
      viewModelsConfig.startViewTransitions,
    ),
  };

  configs.forEach((config) => {
    if (!config) {
      return;
    }

    const { startViewTransitions, comparePayload, ...otherConfigUpdates } =
      config;

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

    if (comparePayload != null) {
      result.comparePayload = comparePayload;
    }

    Object.assign(result, otherConfigUpdates);
  });

  return result;
};
