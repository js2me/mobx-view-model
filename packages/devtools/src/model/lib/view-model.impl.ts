import {
  type AnyViewModel,
  type AnyViewModelSimple,
  ViewModelBase,
  type ViewModelParams,
} from 'mobx-view-model';
import type { AnyObject, EmptyObject } from 'yummies/types';

export class ViewModelImpl<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> extends ViewModelBase<Payload, ParentViewModel, ComponentProps> {
  constructor(vmParams: ViewModelParams<Payload, ParentViewModel>) {
    super({
      ...vmParams,
      vmConfig: {
        observable: {
          viewModels: {
            useDecorators: false,
          },
        },
      },
    });
  }
}
