import { observable } from 'mobx';
import {
  ViewModelBase,
  ViewModelStoreBase,
  type AnyViewModel,
  type AnyViewModelSimple,
  type ViewModelParams,
} from 'mobx-view-model';
import type { AnyObject, EmptyObject } from 'yummies/types';

export class ViewModelBaseMock<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
> extends ViewModelBase<Payload, ParentViewModel> {
  constructor(params?: Partial<ViewModelParams<Payload, ParentViewModel>>) {
    super({
      ...params,
      id: params?.id ?? '1',
      payload: params?.payload as Payload,
    });
  }
}

export class ViewModelStoreBaseMock extends ViewModelStoreBase {}

export class CounterVM extends ViewModelBaseMock {
  private state = observable({ count: 0 });

  get count() {
    return this.state.count;
  }

  increment = () => {
    this.state.count++;
  };
}
