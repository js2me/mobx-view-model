import type { AnyObject, EmptyObject } from 'yummies/types';
import type { ViewModelsConfig } from '../config/types.js';

import type { AnyViewModel, AnyViewModelSimple } from './view-model.types.js';

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
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#vmconfig-viewmodelconfig) */
  readonly vmConfig: ViewModelsConfig;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#payload-payload) */
  readonly payload: Payload;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#ismounted-boolean) */
  readonly isMounted: boolean;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#isunmounting-boolean) */
  readonly isUnmounting: boolean;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#parentviewmodel-parentviewmodel-null) */
  readonly parentViewModel: ParentViewModel;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#mount-void-promise-void) */
  mount(): void | Promise<void>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#unmount-void-promise-void) */
  unmount(): void | Promise<void>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#setpayload-payload-payload-void) */
  setPayload(payload: Payload): void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#payloadchanged-payload-payload-prevpayload-payload-void) */
  payloadChanged(payload: Payload, prevPayload: Payload): void;
}
