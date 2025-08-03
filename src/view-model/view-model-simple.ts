import { AnyObject, EmptyObject } from 'yummies/utils/types';

import { ViewModelStore } from './view-model.store.js';

/**
 * Interface for creating simple view models
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-model-simple.html)
 */
export interface ViewModelSimple<Payload extends AnyObject = EmptyObject> {
  /**
   * Unique identifier for the view model
   */
  readonly id: string;

  mount?(): void;
  unmount?(): void;
  setPayload?(payload: Payload): void;

  /**
   * @deprecated use `attachViewModelStore` instead. Better naming. Will be removed in next major release
   */
  linkStore?(viewModels: ViewModelStore): void;

  attachViewModelStore?(viewModelStore: ViewModelStore): void;
}
