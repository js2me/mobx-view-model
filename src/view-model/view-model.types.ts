import { ViewModelsRawConfig } from '../config/index.js';
import { AnyObject, EmptyObject, Maybe } from '../utils/types.js';

import { ViewModel } from './view-model.js';
import { ViewModelStore } from './view-model.store.js';

export type AnyViewModel = ViewModel<any, any>;

export type PayloadCompareFn<TPayload extends AnyObject = AnyObject> = (
  currentPayload: TPayload | undefined,
  nextPayload: TPayload,
) => boolean;

export type ViewModelPayload<TViewModel extends AnyViewModel> =
  TViewModel extends ViewModel<infer Payload, any> ? Payload : never;

export type ViewModelParent<TViewModel extends AnyViewModel> =
  TViewModel extends ViewModel<any, infer Parent> ? Parent : never;

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
