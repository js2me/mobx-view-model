import { useContext, useRef } from 'react';

import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelLookup,
} from '../view-model/index.js';

/**
 * Get access to **already created** instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/use-view-model.html)
 */
export const useViewModel = <T extends AnyViewModel | AnyViewModelSimple>(
  vmLookup?: ViewModelLookup<T>,
): T => {
  const viewModels = useContext(ViewModelsContext);
  const activeViewModel = useContext(ActiveViewModelContext);
  const model = viewModels?.get(vmLookup);
  const lastModelRef = useRef<any>();

  if (vmLookup == null || !viewModels) {
    if (process.env.NODE_ENV !== 'production' && !viewModels) {
      console.warn(
        'unable to get access to view model by id or class name withouting using ViewModelsStore. Last active view model will be returned',
      );
    }

    if (!activeViewModel) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          'Active ViewModel not found.' +
            'This happens because vm lookup for hook "useViewModel" is not provided and hook trying to lookup active view model using ActiveViewModelContext which works only with using "withViewModel" HOC.' +
            'Please provide vm lookup (first argument for "useViewModel" hook) or use "withViewModel" HOC',
        );
      }
      throw new Error('active view model not found');
    }

    if (process.env.NODE_ENV !== 'production') {
      lastModelRef.current = activeViewModel;
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

    if (process.env.NODE_ENV !== 'production' && lastModelRef.current) {
      return lastModelRef.current;
    } else {
      throw new Error(`View model not found for ${displayName}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    lastModelRef.current = activeViewModel;
  }

  return model;
};
