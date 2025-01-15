import { Maybe } from 'yummies/utils/types';

import { viewModelsConfig } from '../global-config';
import { ViewModelsRawConfig } from '../types';

export const mergeVMConfigs = (...configs: Maybe<ViewModelsRawConfig>[]) => {
  const result = { ...viewModelsConfig };

  configs.forEach((config) => {
    if (!config) {
      return;
    }

    const { startViewTransitions } = result;

    if (startViewTransitions) {
      Object.assign(result.startViewTransitions, startViewTransitions);
    }
  });

  return result;
};
