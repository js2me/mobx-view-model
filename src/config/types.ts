import { ComponentType } from 'react';
import { AnyObject, DeepPartial } from 'yummies/utils/types';

import { ViewModelCreateConfig } from '../view-model/view-model.store.types.js';
import type {
  AnyViewModel,
  PayloadCompareFn,
} from '../view-model/view-model.types.js';

/**
 * Configuration options for view models.
 */
export interface ViewModelsConfig {
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#startviewtransitions) */
  startViewTransitions: {
    mount: boolean;
    unmount: boolean;
    payloadChange: boolean;
  };
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#comparepayload) */
  comparePayload: PayloadCompareFn | 'strict' | 'shallow' | false;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#payloadobservable) */
  payloadObservable: 'ref' | 'deep' | 'shallow' | 'struct';
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#generateid) */
  generateId?: (ctx: AnyObject) => string;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#factory) */
  factory?: (config: ViewModelCreateConfig<AnyViewModel>) => AnyViewModel;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#fallbackcomponent) */
  fallbackComponent?: ComponentType;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#onmount) */
  onMount?: (viewModel: AnyViewModel) => void;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config#onunmount) */
  onUnmount?: (viewModel: AnyViewModel) => void;
}

export type ViewModelsRawConfig = Omit<
  ViewModelsConfig,
  'startViewTransitions'
> & {
  startViewTransitions?:
    | DeepPartial<ViewModelsConfig['startViewTransitions']>
    | boolean;
};
