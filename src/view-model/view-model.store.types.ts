import { ComponentType } from 'react';

import { ViewModelsConfig } from '../config';
import { ComponentWithLazyViewModel, ComponentWithViewModel } from '../hoc';
import { AnyObject, Class, Maybe } from '../utils/types';

import { AnyViewModel, ViewModelParams } from './view-model.types';

export interface ViewModelStoreConfig {
  vmConfig?: Partial<ViewModelsConfig>;
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
  component: ComponentWithViewModel<AnyViewModel, any>;
  componentProps: AnyObject;
}

/**
 * Which types are possible to look up view model instance in view model store
 */
export type ViewModelLookup<T extends AnyViewModel> =
  | AnyViewModel['id']
  | Class<T>
  | ComponentWithViewModel<T, any>
  | ComponentWithLazyViewModel<T, any>;
