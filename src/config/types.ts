import type { AnyObject, Class, DeepPartial, Maybe } from 'yummies/types';

import type { ViewModelHocConfig } from '../hoc/with-view-model.js';
import type {
  AnyViewModel,
  PayloadCompareFn,
  ViewModelCreateConfig,
} from '../view-model/index.js';

import type { ObservableAnnotationsArray } from './utils/apply-observable.js';

export interface ViewModelObservableConfig {
  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config.html#disablewrapping)
   */
  disableWrapping?: boolean;
  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config.html#usedecorators)
   */
  useDecorators: boolean;
  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config.html#custom-context-annotationsarray)
   */
  custom?: (
    context: AnyObject,
    annotationsArray: ObservableAnnotationsArray,
  ) => void;
}

export type GenerateViewModelIdFn = (ctx: AnyObject) => string;

export type CreateViewModelFactoryFn<
  TViewModel extends AnyViewModel = AnyViewModel,
> = (config: ViewModelCreateConfig<TViewModel>) => TViewModel;

/**
 * Configuration options for view models.
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
 */
export interface ViewModelsConfig<VM extends AnyViewModel = AnyViewModel> {
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#startviewtransitions) */
  startViewTransitions: {
    mount: boolean;
    unmount: boolean;
    payloadChange: boolean;
  };
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#comparepayload) */
  comparePayload?: PayloadCompareFn | 'strict' | 'shallow' | false;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#payloadobservable) */
  payloadObservable?: 'ref' | 'deep' | 'shallow' | 'struct' | false;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#payloadcomputed) */
  payloadComputed?: 'struct' | boolean | ((a: any, b: any) => boolean);
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#generateid) */
  generateId: GenerateViewModelIdFn;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#factory) */
  factory: CreateViewModelFactoryFn<VM>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#fallbackcomponent) */
  fallbackComponent?: React.ComponentType;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#onmount) */
  onMount?: (viewModel: VM) => void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#onunmount) */
  onUnmount?: (viewModel: VM) => void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#processviewcomponent) */
  processViewComponent?: (
    component: React.ComponentType<any> | undefined,
    VM: Class<VM>,
    config: ViewModelHocConfig<any>,
  ) => Maybe<React.ComponentType<any>>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#wrapviewsinobserver) */
  wrapViewsInObserver?: boolean;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#observable) */
  observable: {
    viewModels: ViewModelObservableConfig;
    viewModelStores: ViewModelObservableConfig;
  };
}

/**
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
 */
export type ViewModelsRawConfig = Omit<
  ViewModelsConfig,
  'startViewTransitions' | 'observable' | 'factory' | 'generateId'
> & {
  startViewTransitions?:
    | DeepPartial<ViewModelsConfig['startViewTransitions']>
    | boolean;
  observable?: DeepPartial<ViewModelsConfig['observable']>;
  factory?: ViewModelsConfig['factory'];
  generateId?: ViewModelsConfig['generateId'];
};
