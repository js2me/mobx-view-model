import { ComponentType } from 'react';

import { ViewModelsRawConfig } from '../config/index.js';
import { VMLazyComponent, VMComponent } from '../hoc/index.js';
import { AnyObject, Class, Maybe } from '../utils/types.js';

import {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelParams,
} from './view-model.types.js';

export interface ViewModelStoreConfig {
  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
   */
  vmConfig?: ViewModelsRawConfig;
}

export interface ViewModelGenerateIdConfig<VM extends AnyViewModel> {
  VM: Class<VM>;
  id?: Maybe<string>;
  ctx: AnyObject;
  parentViewModelId: string | null;
  fallback?: ComponentType;
}

export interface ViewModelCreateConfig<VM extends AnyViewModel>
  extends ViewModelParams<VM['payload'], VM['parentViewModel']> {
  VM: Class<VM>;
  fallback?: ComponentType;
  component?: VMComponent<AnyViewModel, any>;
  componentProps?: AnyObject;
}

/**
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/other/view-model-lookup)
 */
export type ViewModelLookup<T extends AnyViewModel | AnyViewModelSimple> =
  | AnyViewModel['id']
  | Class<T>
  | (T extends AnyViewModel
      ? VMComponent<T, any> | VMLazyComponent<T, any>
      : Class<T>);
