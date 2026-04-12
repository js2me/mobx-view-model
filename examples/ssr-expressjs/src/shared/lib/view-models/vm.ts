import {
  type AnyViewModel,
  type AnyViewModelSimple,
  ViewModelBase,
  type ViewModelParams,
} from 'mobx-view-model';
import type { AnyObject, EmptyObject } from 'yummies/types';
import type { Globals } from '../../../globals';

export class VM<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> extends ViewModelBase<Payload, ParentViewModel, ComponentProps> {
  constructor(
    public globals: Globals,
    params: ViewModelParams<Payload, ParentViewModel, ComponentProps>,
  ) {
    // @ts-expect-error
    super(params);
  }
}
