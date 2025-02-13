import { ViewModelsRawConfig } from '../config/index.js';
import { AnyObject, EmptyObject, Maybe } from '../utils/types.js';

import { ViewModel } from './view-model.js';
import { ViewModelStore } from './view-model.store.js';

export type AnyViewModel = ViewModel<any, any>;

export type PayloadCompareFn = (a: AnyObject, b: AnyObject) => boolean;

export interface ViewModelParams<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | null = null,
> {
  /**
   * Unique identifier for the view
   */
  id: string;
  payload: Payload;
  viewModels?: Maybe<ViewModelStore>;
  parentViewModelId?: Maybe<string>;
  parentViewModel?: Maybe<ParentViewModel>;
  /**
   * Additional data that may be useful when creating the VM
   */
  ctx?: AnyObject;
  /**
   * Additional configuration for the view model
   * See {@link ViewModelsConfig}
   */
  config?: ViewModelsRawConfig;
}
