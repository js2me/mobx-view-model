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
  /**
   * Indicates whether to enable transitions for the start view.
   *
   * !!! This feature is experimental and not all browsers support it yet.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMException)
   */
  startViewTransitions: {
    mount: boolean;
    unmount: boolean;
    payloadChange: boolean;
  };
  /**
   * Comparing payloads.
   * - `'strict'` - strict equality
   * - `'shallow'` - shallow equality
   * - false - no comparison
   * - custom payload compare fn
   */
  comparePayload: PayloadCompareFn | 'strict' | 'shallow' | false;
  /**
   * Indicates whether to use `ref` or `deep` observable for payload.
   * - `'ref'` - use `ref` observable
   * - `'deep'` - use `deep` observable
   */
  payloadObservable: 'ref' | 'deep';
  /**
   * Generates an ID for a view model.
   * @param ctx
   */
  generateId?: (ctx: AnyObject) => string;
  /**
   * Factory function for creating view models.
   */
  factory?: (config: ViewModelCreateConfig<AnyViewModel>) => AnyViewModel;
  /**
   * Fallback component to use when a view model is loading or processing to render.
   */
  fallbackComponent?: ComponentType;
  onMount?: (viewModel: AnyViewModel) => void;
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
