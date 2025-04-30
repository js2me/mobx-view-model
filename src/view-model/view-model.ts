import { ViewModelsConfig } from '../config/types.js';
import { AnyObject, EmptyObject } from '../utils/types.js';

import { AnyViewModel } from './view-model.types.js';

/**
 * The main interface for all view models.
 * View model is a class that helps to manage state and lifecycle of a component.
 */

export interface ViewModel<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | null = null,
> {
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#id-string) */
  readonly id: string;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#vmconfig-viewmodelconfig) */
  readonly vmConfig: ViewModelsConfig;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#payload-payload) */
  readonly payload: Payload;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#ismounted-boolean) */
  isMounted: boolean;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#isunmounting-boolean) */
  isUnmounting: boolean;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#parentviewmodel-parentviewmodel-null) */
  readonly parentViewModel: ParentViewModel;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#willmount-void) */
  willMount(): void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#mount-void-promise-void) */
  mount(): void | Promise<void>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#didmount-void) */
  didMount(): void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#didunmount-void) */
  didUnmount(): void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#willunmount-void) */
  willUnmount(): void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#unmount-void-promise-void) */
  unmount(): void | Promise<void>;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#setpayload-payload-payload-void) */
  setPayload(payload: Payload): void;
  /** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/interface#payloadchanged-void) */
  payloadChanged(payload: Payload): void;
}
