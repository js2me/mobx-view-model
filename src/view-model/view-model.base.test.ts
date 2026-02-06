import { makeObservable, reaction } from 'mobx';
import { describe, expect, it, vi } from 'vitest';

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
  spies = {
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

describe('ViewModelBase', () => {
  it('create instance', () => {
    const vm = new ViewModelBaseMock();
    expect(vm).toBeDefined();
  });

  it('has id', () => {
    const vm = new ViewModelBaseMock();
    expect(vm.id).toBe('1');
  });

  it('has payload', () => {
    const vm = new ViewModelBaseMock({ payload: { test: 1 } });
    expect(vm.payload).toEqual({ test: 1 });
  });

  it('has isMounted', () => {
    const vm = new ViewModelBaseMock();
    expect(vm.isMounted).toBe(false);
  });

  it('has mount method', () => {
    const vm = new ViewModelBaseMock();
    expect(vm.mount).toBeDefined();
  });

  it('has unmount method', () => {
    const vm = new ViewModelBaseMock();
    expect(vm.unmount).toBeDefined();
  });

  it('mount should be called once', () => {
    const vm = new ViewModelBaseMock();

    vm.mount();

    expect(vm.spies.mount).toHaveBeenCalledOnce();
  });

  it('didMount should be called after mount', () => {
    const vm = new ViewModelBaseMock();

    vm.mount();

    expect(vm.spies.didMount).toHaveBeenCalledOnce();
  });

  it('willMount should be called before didMount on mount', () => {
    const vm = new ViewModelBaseMock();

    vm.mount();

    expect(vm.spies.willMount).toHaveBeenCalledOnce();
    expect(vm.spies.willMount.mock.invocationCallOrder[0]).toBeLessThan(
      vm.spies.didMount.mock.invocationCallOrder[0],
    );
  });

  it('mount should be called before willMount and didMount', () => {
    const vm = new ViewModelBaseMock();

    vm.mount();

    expect(vm.spies.mount.mock.invocationCallOrder[0]).toBeLessThan(
      vm.spies.willMount.mock.invocationCallOrder[0],
    );
    expect(vm.spies.mount.mock.invocationCallOrder[0]).toBeLessThan(
      vm.spies.didMount.mock.invocationCallOrder[0],
    );
  });

  it('isMounted should be true after mount', () => {
    const vm = new ViewModelBaseMock();
    vm.mount();
    expect(vm.isMounted).toBe(true);
  });

  it('unmount should be called once', () => {
    const vm = new ViewModelBaseMock();

    vm.unmount();

    expect(vm.spies.unmount).toHaveBeenCalledOnce();
  });

  it('didUnmount should be called after unmount', () => {
    const vm = new ViewModelBaseMock();

    vm.unmount();

    expect(vm.spies.didUnmount).toHaveBeenCalledOnce();
  });

  it('willUnmount should be called before didUnmount on unmount', () => {
    const vm = new ViewModelBaseMock();

    vm.unmount();

    expect(vm.spies.willUnmount).toHaveBeenCalledOnce();
    expect(vm.spies.willUnmount.mock.invocationCallOrder[0]).toBeLessThan(
      vm.spies.didUnmount.mock.invocationCallOrder[0],
    );
  });

  it('unmount should be called before willUnmount and didUnmount', () => {
    const vm = new ViewModelBaseMock();

    vm.unmount();

    expect(vm.spies.unmount.mock.invocationCallOrder[0]).toBeLessThan(
      vm.spies.willUnmount.mock.invocationCallOrder[0],
    );
    expect(vm.spies.unmount.mock.invocationCallOrder[0]).toBeLessThan(
      vm.spies.didUnmount.mock.invocationCallOrder[0],
    );
  });

  it('isMounted should be false after unmount', () => {
    const vm = new ViewModelBaseMock();
    vm.mount();
    vm.unmount();
    expect(vm.isMounted).toBe(false);
  });

  it('isMounted reaction should be work', () => {
    const vm = new ViewModelBaseMock();
    const spy = vi.fn();

    const dispose = reaction(
      () => vm.isMounted,
      (value) => {
        spy(value);
      },
    );

    vm.mount();
    vm.unmount();

    expect(spy).toBeCalledTimes(2);
    expect(spy).nthCalledWith(1, true);
    expect(spy).nthCalledWith(2, false);

    dispose();
  });

  it('setPayload should respect comparePayload and pass prev payload', () => {
    const payload1 = { value: 1 };
    const payload2 = { value: 1 };
    const payload3 = { value: 2 };

    const vm = new ViewModelBaseMock({
      payload: payload1,
      vmConfig: {
        comparePayload: (current, next) => current?.value === next.value,
      },
    });

    vm.setPayload(payload2);
    expect(vm.payload).toBe(payload1);
    expect(vm.spies.payloadChanged).not.toHaveBeenCalled();

    vm.setPayload(payload3);
    expect(vm.payload).toBe(payload3);
    expect(vm.spies.payloadChanged).toHaveBeenCalledOnce();
    expect(vm.spies.payloadChanged).toHaveBeenCalledWith(payload3, payload1);
  });

  it('isUnmounting should be true during willUnmount and false after', () => {
    class UnmountStateMock extends ViewModelBaseMock {
      isUnmountingAtWillUnmount: boolean | null = null;

      protected willUnmount(): void {
        this.isUnmountingAtWillUnmount = this.isUnmounting;
        super.willUnmount();
      }
    }

    const vm = new UnmountStateMock();

    expect(vm.isUnmounting).toBe(false);
    vm.unmount();
    expect(vm.isUnmountingAtWillUnmount).toBe(true);
    expect(vm.isUnmounting).toBe(false);
  });

  it('unmountSignal should be aborted after unmount', () => {
    const vm = new ViewModelBaseMock();
    const spy = vi.fn();

    expect(vm.unmountSignal.aborted).toBe(false);
    vm.unmountSignal.addEventListener('abort', spy);

    vm.unmount();

    expect(vm.unmountSignal.aborted).toBe(true);
    expect(spy).toHaveBeenCalledOnce();
  });
});
