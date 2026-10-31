import {
  type AnyViewModel,
  type AnyViewModelSimple,
  ViewModelBase,
  type ViewModelParams,
} from 'mobx-view-model';
import type { AnyObject, EmptyObject } from 'yummies/types';
import type { RootStore } from '../../stores/root-store/index.js';

export class VM<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> extends ViewModelBase<Payload, ParentViewModel, ComponentProps> {
  constructor(
    protected rootStore: RootStore,
    params: ViewModelParams<Payload, ParentViewModel, ComponentProps>,
  ) {
    super(params);
  }
}
