import { useContext } from 'react';

import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import { AnyViewModel, ViewModelLookup } from '../view-model/index.js';

export const useViewModel = <T extends AnyViewModel>(
  vmLookup?: ViewModelLookup<T>,
): T => {
  const viewModels = useContext(ViewModelsContext);
  const activeViewModel = useContext(ActiveViewModelContext);
  const model = viewModels?.get<T>(vmLookup);

  if (vmLookup == null || !viewModels) {
    if (process.env.NODE_ENV !== 'production' && !viewModels) {
      console.warn(
        'unable to get access to view model by id or class name withouting using ViewModelsStore. Last active view model will be returned',
      );
    }

    if (!activeViewModel) {
      throw new Error('No active view model');
    }

    return activeViewModel as unknown as T;
  }

  if (!model) {
    let displayName: string = '';

    if (typeof vmLookup === 'string') {
      displayName = vmLookup;
    } else if ('name' in vmLookup) {
      displayName = vmLookup.name;
    } else {
      displayName = vmLookup['displayName'];
    }

    throw new Error(`View model not found for ${displayName}`);
  }

  return model;
};
