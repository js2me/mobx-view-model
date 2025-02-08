import { reaction } from 'mobx';
import { describe, expect, it, vi } from 'vitest';

import { AnyObject, EmptyObject } from '../utils/types.js';

import { ViewModelBase } from './view-model.base.js';
import { AnyViewModel, ViewModelParams } from './view-model.types.js';

export class ViewModelBaseMock<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | null = null,
> extends ViewModelBase<Payload, ParentViewModel> {
  spies = {
    mount: vi.fn(),
    unmount: vi.fn(),
    payloadChanged: vi.fn(),
    didMount: vi.fn(),
    didUnmount: vi.fn(),
  };

  constructor(params?: Partial<ViewModelParams<Payload, ParentViewModel>>) {
    super({
      ...params,
      id: params?.id ?? '1',
      payload: params?.payload as Payload,
    });
  }

  didMount(): void {
    super.didMount();
    this.spies.didMount();
  }

  mount(): void {
    this.spies.mount();
    super.mount();
  }

  unmount(): void {
    this.spies.unmount();
    super.unmount();
  }

  payloadChanged(payload: any): void {
    this.spies.payloadChanged(payload);
  }

  didUnmount(): void {
    this.spies.didUnmount();
    super.didUnmount();
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
});
