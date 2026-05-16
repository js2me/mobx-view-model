import { makeObservable } from 'mobx';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import type { AnyObject, EmptyObject } from 'yummies/types';

import { ViewModelBase } from './view-model.base.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelParams,
} from './view-model.types.js';

export class ViewModelBaseMock<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
> extends ViewModelBase<Payload, ParentViewModel> {
  spies: {
    mount: Mock<() => void>;
    unmount: Mock<() => void>;
    payloadChanged: Mock<(payload: any, prevPayload: any) => void>;
    willMount: Mock<() => void>;
    didMount: Mock<() => void>;
    willUnmount: Mock<() => void>;
    didUnmount: Mock<() => void>;
  } = {
    mount: vi.fn(),
    unmount: vi.fn(),
    payloadChanged: vi.fn(),
    willMount: vi.fn(),
    didMount: vi.fn(),
    willUnmount: vi.fn(),
    didUnmount: vi.fn(),
  };

  constructor(params?: Partial<ViewModelParams<Payload, ParentViewModel>>) {
    super({
      ...params,
      id: params?.id ?? '1',
      payload: params?.payload as Payload,
    });
    makeObservable(this);
  }

  protected didMount(): void {
    this.spies.didMount();
  }

  protected willMount(): void {
    this.spies.willMount();
  }

  mount(): void {
    this.spies.mount();
    super.mount();
  }

  unmount(): void {
    this.spies.unmount();
    super.unmount();
  }

  payloadChanged(payload: any, prevPayload: any): void {
    this.spies.payloadChanged(payload, prevPayload);
  }

  protected didUnmount(): void {
    this.spies.didUnmount();
  }

  protected willUnmount(): void {
    this.spies.willUnmount();
  }
}
