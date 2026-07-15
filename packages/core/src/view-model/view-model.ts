import type { AnyObject, EmptyObject, MaybePromise } from 'yummies/types';
import type { ViewModelsConfig } from '../config/types.js';

import type { AnyViewModel, AnyViewModelSimple, ViewModelInitConfig } from './view-model.types.js';
import { ViewModelCreateConfig, ViewModelStore } from './index.js';

/**
 * The main interface for all view models.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface)
 */
export interface ViewModel<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
> {
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#id-string) */
  readonly id: string;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#payload-payload) */
  readonly payload: Payload;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#ismounted-boolean) */
  readonly isMounted: boolean;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#parentviewmodel-parentviewmodel-null) */
  readonly parentViewModel: ParentViewModel;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#init) */
  init?(config: ViewModelInitConfig<this>): void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#mount-void-promise-void) */
  mount(): MaybePromise<void>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#unmount-void-promise-void) */
  unmount(): void;
  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#setpayload-payload-payload-void)
   *
   * The React integration may call this on **every render** while the component is mounted in the tree,
   * including **before** `mount()` has finished (and while `isMounted` is still `false`), so `payloadChanged`
   * and side effects should not assume a fully mounted view model.
   */
  setPayload(payload: Payload): boolean;
}
