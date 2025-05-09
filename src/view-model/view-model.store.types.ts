import { ComponentType } from 'react';

import { ViewModelsRawConfig } from '../config/index.js';
import {
  ComponentWithLazyViewModel,
  ComponentWithViewModel,
} from '../hoc/index.js';
import { AnyObject, Class, Maybe } from '../utils/types.js';

import {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelParams,
} from './view-model.types.js';

export interface ViewModelStoreConfig {
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
  component?: ComponentWithViewModel<AnyViewModel, any>;
  componentProps?: AnyObject;
}

/**
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/other/view-model-lookup)
 */
export type ViewModelLookup<T extends AnyViewModel | AnyViewModelSimple> =
  | AnyViewModel['id']
  | Class<T>
  | ComponentWithViewModel<AnyViewModel & T, any>
  | ComponentWithLazyViewModel<AnyViewModel & T, any>;
