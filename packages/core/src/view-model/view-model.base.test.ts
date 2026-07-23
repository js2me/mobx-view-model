import { makeObservable, reaction } from 'mobx';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import type { AnyObject, EmptyObject } from 'yummies/types';

import { ViewModelBase } from './view-model.base.js';
import type { InferViewModelParams } from './view-model.base.types.js';
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
    willMount: Mock<() => void>;
    didMount: Mock<() => void>;
    willUnmount: Mock<() => void>;
    didUnmount: Mock<() => void>;
  } = {
    mount: vi.fn(),
    unmount: vi.fn(),
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

  it('setPayload should respect comparePayload', () => {
    const payload1 = { value: 1 };
    const payload2 = { value: 1 };
    const payload3 = { value: 2 };

    const vm = new ViewModelBaseMock({
      payload: payload1,
      vmConfig: {
        comparePayload: (current, next) => current?.value === next.value,
      },
    });

    expect(vm.setPayload(payload2)).toBe(true);
    expect(vm.payload).toBe(payload1);

    expect(vm.setPayload(payload3)).toBe(false);
    expect(vm.payload).toBe(payload3);
  });

  it('re-entrant mount reuses in-flight promise', async () => {
    let resolveWillMount!: () => void;
    const willMountPromise = new Promise<void>((resolve) => {
      resolveWillMount = resolve;
    });

    class AsyncVM extends ViewModelBaseMock {
      protected willMount() {
        super.willMount();
        return willMountPromise;
      }
    }

    const vm = new AsyncVM();
    const first = vm.mount();
    const second = vm.mount();

    expect(first).toBe(second);
    expect(vm.isMounted).toBe(false);

    resolveWillMount();
    await first;

    expect(vm.isMounted).toBe(true);
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

  describe('hasChild / hasParent', () => {
    class RelationsVM extends ViewModelBaseMock<
      any,
      AnyViewModel | AnyViewModelSimple | null
    > {
      hasChildPublic(vm: AnyViewModel | AnyViewModelSimple, deep?: boolean) {
        return this.hasChild(vm, deep);
      }
      hasParentPublic(vm: AnyViewModel | AnyViewModelSimple, deep?: boolean) {
        return this.hasParent(vm, deep);
      }
    }

    const createTree = () => {
      const root = new RelationsVM({ id: 'root' });
      const child = new RelationsVM({ id: 'child', parentViewModel: root });
      const grandchild = new RelationsVM({
        id: 'grandchild',
        parentViewModel: child,
      });

      return { root, child, grandchild };
    };

    it('hasChild: shallow (deep undefined/false)', () => {
      const { root, child, grandchild } = createTree();

      expect(root.hasChildPublic(child)).toBe(true);
      expect(root.hasChildPublic(child, false)).toBe(true);

      expect(root.hasChildPublic(grandchild)).toBe(false);
      expect(root.hasChildPublic(grandchild, false)).toBe(false);

      expect(child.hasChildPublic(grandchild)).toBe(true);
      expect(child.hasChildPublic(root)).toBe(false);
    });

    it('hasChild: deep', () => {
      const { root, child, grandchild } = createTree();

      expect(root.hasChildPublic(child, true)).toBe(true);
      expect(root.hasChildPublic(grandchild, true)).toBe(true);

      expect(child.hasChildPublic(grandchild, true)).toBe(true);
      expect(child.hasChildPublic(root, true)).toBe(false);

      expect(root.hasChildPublic(root, true)).toBe(false);
    });

    it('hasParent: shallow (deep undefined/false)', () => {
      const { root, child, grandchild } = createTree();

      expect(child.hasParentPublic(root)).toBe(true);
      expect(child.hasParentPublic(root, false)).toBe(true);

      expect(grandchild.hasParentPublic(child)).toBe(true);
      expect(grandchild.hasParentPublic(root)).toBe(false);
    });

    it('hasParent: deep', () => {
      const { root, child, grandchild } = createTree();

      expect(child.hasParentPublic(root, true)).toBe(true);
      expect(grandchild.hasParentPublic(child, true)).toBe(true);
      expect(grandchild.hasParentPublic(root, true)).toBe(true);

      expect(root.hasParentPublic(child, true)).toBe(false);
      expect(root.hasParentPublic(root, true)).toBe(false);
    });
  });

  describe('ViewModelParams type', () => {
    it('constructor(params: InferViewModelParams<VM>) should work', () => {
      class TestVM extends ViewModelBase<{ x: number }> {
        constructor(params: InferViewModelParams<TestVM>) {
          super(params);
        }
      }

      const vm = new TestVM({ id: '1', payload: { x: 1 } });
      expect(vm.id).toBe('1');
      expect(vm.payload).toEqual({ x: 1 });
    });
  });
});
