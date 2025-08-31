import type { ViewModelsRawConfig } from '../config/index.js';
import type { AnyObject, EmptyObject, Maybe } from '../utils/types.js';
import type { ViewModel } from './view-model.js';
import type { ViewModelStore } from './view-model.store.js';
import type { ViewModelSimple } from './view-model-simple.js';

export type AnyViewModel = ViewModel<any, any>;

export type AnyViewModelSimple = ViewModelSimple<any>;

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
  ComponentProps extends AnyObject = AnyObject,
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
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
   */
  vmConfig?: ViewModelsRawConfig;
  /**
   * Additional configuration for the view model
   * See {@link ViewModelsConfig}
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
   *
   * @deprecated use `vmConfig` instead. Will be removed in next major release
   */
  config?: ViewModelsRawConfig;
  /**
   * Original component props
   */
  props?: ComponentProps;
}
