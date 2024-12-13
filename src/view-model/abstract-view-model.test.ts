import { reaction } from 'mobx';
import { describe, expect, it, vi } from 'vitest';

import { AnyObject, EmptyObject, Maybe } from '../utils/types';

import { AbstractViewModel } from './abstract-view-model';
import { AbstractViewModelParams } from './abstract-view-model.types';
import { AnyViewModel } from './view-model.types';

export class TestAbstractViewModelImpl<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | null = null,
> extends AbstractViewModel<Payload, ParentViewModel> {
  spies = {
    mount: vi.fn(),
    unmount: vi.fn(),
    payloadChanged: vi.fn(),
    didMount: vi.fn(),
    didUnmount: vi.fn(),
  };

  constructor(params?: Partial<AbstractViewModelParams<Payload>>) {
    super({
      ...params,
      id: params?.id ?? '1',
      payload: params?.payload ?? ({} as any),
    });
  }

  protected getParentViewModel(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parentViewModelId: Maybe<string>,
  ): ParentViewModel {
    throw new Error('Method not implemented.');
  }

  didMount(): void {
    this.spies.didMount();
  }

  mount(): void {
    super.mount();
    this.spies.mount();
  }

  unmount(): void {
    super.unmount();
    this.spies.unmount();
  }

  payloadChanged(payload: any): void {
    this.spies.payloadChanged(payload);
  }

  didUnmount(): void {
    this.spies.didUnmount();
  }
}

describe('AbstractViewModel', () => {
  it('create instance', () => {
    const vm = new TestAbstractViewModelImpl();
    expect(vm).toBeDefined();
  });

  it('has id', () => {
    const vm = new TestAbstractViewModelImpl();
    expect(vm.id).toBe('1');
  });

  it('has payload', () => {
    const vm = new TestAbstractViewModelImpl({ payload: { test: 1 } });
    expect(vm.payload).toEqual({ test: 1 });
  });

  it('has isMounted', () => {
    const vm = new TestAbstractViewModelImpl();
    expect(vm.isMounted).toBe(false);
  });

  it('has mount method', () => {
    const vm = new TestAbstractViewModelImpl();
    expect(vm.mount).toBeDefined();
  });

  it('has unmount method', () => {
    const vm = new TestAbstractViewModelImpl();
    expect(vm.unmount).toBeDefined();
  });

  it('has dispose', () => {
    const vm = new TestAbstractViewModelImpl();
    expect(vm.dispose).toBeDefined();
  });

  it('mount should be called once', () => {
    const vm = new TestAbstractViewModelImpl();

    vm.mount();

    expect(vm.spies.mount).toHaveBeenCalledOnce();
  });

  it('didMount should be called after mount', () => {
    const vm = new TestAbstractViewModelImpl();

    vm.mount();

    expect(vm.spies.didMount).toHaveBeenCalledOnce();
  });

  it('isMounted should be true after mount', () => {
    const vm = new TestAbstractViewModelImpl();
    vm.mount();
    expect(vm.isMounted).toBe(true);
  });

  it('unmount should be called once', () => {
    const vm = new TestAbstractViewModelImpl();

    vm.unmount();

    expect(vm.spies.unmount).toHaveBeenCalledOnce();
  });

  it('didUnmount should be called after unmount', () => {
    const vm = new TestAbstractViewModelImpl();

    vm.unmount();

    expect(vm.spies.didUnmount).toHaveBeenCalledOnce();
  });

  it('isMounted should be false after unmount', () => {
    const vm = new TestAbstractViewModelImpl();
    vm.mount();
    vm.unmount();
    expect(vm.isMounted).toBe(false);
  });

  it('isMounted reaction should be work', () => {
    const vm = new TestAbstractViewModelImpl();
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
