import type { PubSub } from 'yummies/complex';
import type { ObservableAnnotationsArray } from 'yummies/mobx';
import type { AnyObject, Class, DeepPartial, Maybe, PartialKeys } from 'yummies/types';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  PayloadCompareFn,
  ViewModelCreateConfig,
  ViewModelStore,
} from '../view-model/index.js';

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
  TViewModel extends AnyViewModel | AnyViewModelSimple = AnyViewModel | AnyViewModelSimple,
> = (config: ViewModelCreateConfig<TViewModel>) => TViewModel;

/**
 * Configuration options for view models.
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
 */
export interface ViewModelsConfig<
  TViewModel extends AnyViewModel = AnyViewModel,
> {
  getPayload: (allProps: any) => any;
  mode: 'csr' | 'ssr';
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#startviewtransitions) */
  startViewTransitions: {
    mount: boolean;
    unmount: boolean;
    payloadChange: boolean;
  };
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#comparepayload) */
  comparePayload?: PayloadCompareFn | 'strict' | 'shallow' | false;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#payloadobservable) */
  payloadObservable: 'ref' | 'deep' | 'shallow' | 'struct' | false;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#payloadcomputed) */
  payloadComputed: 'struct' | boolean | ((a: any, b: any) => boolean);
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#factory) */
  factory: CreateViewModelFactoryFn<AnyViewModel | AnyViewModelSimple>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#fallbackcomponent) */
  fallbackComponent?: import('mobx-view-model-react').RComponentType;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#reacthook) */
  reactHook?: import('mobx-view-model-react').WithViewModelReactHook;
  /**
   * Wait until the returned value is ready before continuing render.
   * Return nothing to skip waiting for this call (e.g. when suspension is not needed).
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#suspenduntil)
   */
  suspendUntil?: (
    instance: TViewModel | AnyViewModelSimple,
  ) => Maybe<import('mobx-view-model-react').RUsable<unknown>>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#onmount) */
  onMount?: (viewModel: TViewModel) => void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#onunmount) */
  onUnmount?: (viewModel: TViewModel) => void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#hooks) */
  readonly hooks: {
    /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#hooks) */
    readonly storeCreate: PubSub<
      [viewModelStore: ViewModelStore<AnyViewModel>]
    >;
  };
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#processviewcomponent) */
  processRender?: (
    renderFn: import('mobx-view-model-react').RRenderFn<AnyObject> | undefined,
    VM: Class<TViewModel>,
    /** Полный тип HOC — `ViewModelHocConfig` в `mobx-view-model-react`. */
    config: AnyObject,
  ) => Maybe<import('mobx-view-model-react').RRenderFn<any>>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#observable) */
  observable: {
    viewModels: ViewModelObservableConfig;
    viewModelStores: ViewModelObservableConfig;
  };
}

/**
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
 */
export type ViewModelsRawConfig<
  TViewModel extends AnyViewModel = AnyViewModel,
> = PartialKeys<Omit<
ViewModelsConfig<TViewModel>,
'startViewTransitions' | 'observable' | 'factory' | 'generateId' | 'hooks' | 'mode' | 'getPayload'
>, 'payloadObservable' | 'payloadComputed' | 'fallbackComponent'> & {
  startViewTransitions?:
    | DeepPartial<ViewModelsConfig['startViewTransitions']>
    | boolean;
  observable?: DeepPartial<ViewModelsConfig['observable']>;
  factory?: ViewModelsConfig['factory'];
};
