import { useContext, useRef } from 'react';
import type { AnyObject } from 'yummies/types';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelLookup,
} from '../../view-model/index.js';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';

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

  // This ref is needed only for development
  // support better HMR in vite
  let devModeModelRef = undefined as unknown as React.MutableRefObject<any>;

  if (process.env.NODE_ENV !== 'production') {
    devModeModelRef = useRef<any>();
  }

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
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          'Error #1: Active ViewModel not found.\n' +
            'This happened because "vmLookup" for hook "useViewModel" is not provided and hook trying to lookup active view model using ActiveViewModelContext which works only with using "withViewModel" HOC.\n' +
            'Please provide "vmLookup" (first argument for "useViewModel" hook) or use "withViewModel" HOC.\n' +
            'More info: https://js2me.github.io/mobx-view-model/errors/1',
        );
      }
      throw new Error(
        'Error #1: https://js2me.github.io/mobx-view-model/errors/1',
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      devModeModelRef.current = activeViewModel;
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
      displayName = (vmLookup as AnyObject).displayName;
    }

    if (process.env.NODE_ENV !== 'production') {
      if (devModeModelRef.current) {
        return devModeModelRef.current;
      } else {
        throw new Error(
          `Error #2: View model not found for ${displayName}.\n` +
            'This happened because your "vmLookup" provided for hook "useViewModel" is not found in "ViewModelStore".\n' +
            'More info: https://js2me.github.io/mobx-view-model/errors/2',
        );
      }
    } else {
      throw new Error(
        'Error #2: https://js2me.github.io/mobx-view-model/errors/2',
      );
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    devModeModelRef.current = activeViewModel;
  }

  return model;
};
