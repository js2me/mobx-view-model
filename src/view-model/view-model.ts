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
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#id) */
  readonly id: string;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#payload) */
  payload: Payload;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#ismounted) */
  isMounted: boolean;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#isunmounting) */
  isUnmounting: boolean;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#parentviewmodel) */
  readonly parentViewModel: ParentViewModel;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#willmount) */
  willMount(): void;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#mount) */
  mount(): void | Promise<void>;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#didmount) */
  didMount(): void;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#didunmount) */
  didUnmount(): void;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#willunmount) */
  willUnmount(): void;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#unmount) */
  unmount(): void | Promise<void>;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#setpayloadpayload-payload) */
  setPayload(payload: Payload): void;
  /** [Documentation](https://js2me.github.io/mobx-view-model/api/view-models/interface#payloadchanged) */
  payloadChanged(payload: Payload): void;
}
