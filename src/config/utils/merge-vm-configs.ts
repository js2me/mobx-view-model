import { Maybe } from 'yummies/utils/types';

import { viewModelsConfig } from '../global-config';
import { ViewModelsConfig } from '../types';

export const mergeVMConfigs = (
  ...configs: Maybe<Partial<ViewModelsConfig>>[]
) => {
  const result = { ...viewModelsConfig };

  configs.forEach((config) => {
    Object.assign(result, config || {});
  });

  return result;
};
