import type { AnyObject, EmptyObject, Maybe } from 'yummies/types';
import type { ViewModelsConfig, ViewModelsRawConfig } from '../config/index.js';
import type { ViewModel } from './view-model.js';
import type { ViewModelStore } from './view-model.store.js';
import type { ViewModelSimple } from './view-model-simple.js';
import type { ViewModelCreateConfig } from './view-model.store.types.js';
import type { ViewModelLifecycleState } from './view-model.base.types.js';

export type AnyViewModel = ViewModel<any, any>;

export type AnyViewModelSimple = ViewModelSimple<any, AnyViewModel | AnyViewModelSimple | null>;

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
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> {
  /**
   * Unique identifier for the view
   */
  id: string;
  payload: Payload;
  viewModels?: Maybe<ViewModelStore>;
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
   * Original component props
   */
  props?: ComponentProps;
  /** Data resolved by the store resource for this VM id. */
  data?: unknown;
}


export type ViewModelInitConfig<VM extends AnyViewModel | AnyViewModelSimple> =
  ViewModelCreateConfig<VM> & { viewModels?: ViewModelStore };

export interface ViewModelInfo {
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#vm-state-viewmodellifecyclestate) */
  state: ViewModelLifecycleState;
  data: unknown;
}

export interface ViewModelFullInfo<
  Payload extends AnyObject = AnyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> extends ViewModelInfo {
  params: ViewModelParams<Payload, ParentViewModel, ComponentProps>;
  config: ViewModelsConfig;
  payloadComparator?: PayloadCompareFn<Payload>;
  payload: Payload;
}
