import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelLookup,
} from 'mobx-view-model';
import { useContext, useRef } from 'react';
import type { AnyObject } from 'yummies/types';
import { viewModelError } from '../lib/view-model-error.js';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import { getRenderPhaseViewModel } from './staged-view-model.js';

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
  // Keep the previous context available across Vite HMR in development.
  const devModeModelRef = process.env.NODE_ENV !== 'production' ? useRef<any>(undefined) : null;

  if (vmLookup == null || !viewModels) {
    if (process.env.NODE_ENV !== 'production' && !viewModels) {
      console.warn(
        'Warning #1: ViewModelStore not found.\n',
        'Unable to get access to view model by id or class name without using ViewModelStore\n',
        'Last active view model will be returned.\n',
        'More info: https://js2me.github.io/mobx-view-model/warnings/1',
      );
    }

    if (!activeViewModel) {
      throw viewModelError(1, process.env.NODE_ENV !== 'production'
        ? 'Active ViewModel not found.\n' +
          'This happened because "vmLookup" for hook "useViewModel" is not provided and hook trying to lookup active view model using ActiveViewModelContext which works only with using "withViewModel" HOC.\n' +
          'Please provide "vmLookup" (first argument for "useViewModel" hook) or use "withViewModel" HOC.'
        : undefined);
    }

    if (process.env.NODE_ENV !== 'production') devModeModelRef!.current = activeViewModel;

    return activeViewModel as unknown as T;
  }

  const model = getRenderPhaseViewModel<T>(viewModels, vmLookup);
  if (!model) {
    if (process.env.NODE_ENV !== 'production') {
      if (devModeModelRef?.current) return devModeModelRef.current;
      const displayName = typeof vmLookup === 'string'
        ? vmLookup
        : 'name' in vmLookup ? vmLookup.name : (vmLookup as AnyObject).displayName;
      throw viewModelError(2,
        `View model not found for ${displayName}.\n` +
          'This happened because your "vmLookup" provided for hook "useViewModel" is not found in "ViewModelStore".',
      );
    }
    throw viewModelError(2);
  }

  if (process.env.NODE_ENV !== 'production') devModeModelRef!.current = activeViewModel;

  return model;
};
