import { describe, expect, it, vi } from 'vitest';
import type { ViewModelStore } from './index.js';
import { ViewModelStoreBaseMock } from './view-model.store.base.test.js';
import type { ViewModelSimple } from './view-model-simple.js';

export class ViewModelSimpleImpl implements ViewModelSimple<{ test: number }> {
  spies = {
    mount: vi.fn(),
    attachViewModelStore: vi.fn(),
    setPayload: vi.fn(),
    unmount: vi.fn(),
  };

  id: string;

  constructor(id: string = '1') {
    this.id = id;
  }

  mount(): void {
    this.spies.mount();
  }

  attachViewModelStore(viewModels: ViewModelStore): void {
    this.spies.attachViewModelStore(viewModels);
  }

  setPayload(payload: { test: number }): void {
    this.spies.setPayload(payload);
  }

  unmount(): void {
    this.spies.unmount();
  }
}

describe('ViewModelSimple', () => {
  it('create instance', () => {
    const vm = new ViewModelSimpleImpl();
    expect(vm).toBeDefined();
  });

  it('has id', () => {
    const vm = new ViewModelSimpleImpl();
    expect(vm.id).toBe('1');
  });

  describe('work with vm store', () => {
    it('should call "linkStore"', () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm = new ViewModelSimpleImpl();
      vmStore.markToBeAttached(vm);
      expect(vm.spies.attachViewModelStore).toBeCalledTimes(1);
      expect(vm.spies.attachViewModelStore).toBeCalledWith(vmStore);
    });

    it('should ok "attach" simple vm to store', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm1 = new ViewModelSimpleImpl('1');
      const vm2 = new ViewModelSimpleImpl('2');

      await vmStore.attach(vm1);
      await vmStore.attach(vm2);

      expect(vm1.spies.mount).toBeCalledTimes(1);
      expect(vm2.spies.mount).toBeCalledTimes(1);

      expect([...vmStore._viewModels.values()]).toHaveLength(2);
      expect([...vmStore._mountingViews.values()]).toHaveLength(0);
      expect([...vmStore._unmountingViews.values()]).toHaveLength(0);
      expect([...vmStore._linkedComponentVMClasses.values()]).toHaveLength(0);
      expect([...vmStore._instanceAttachedCount.values()]).toHaveLength(2);
      expect([...vmStore._viewModelIdsByClasses.values()]).toHaveLength(1);
    });

    it('should ok "detach" simple vm to store', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm1 = new ViewModelSimpleImpl('1');
      const vm2 = new ViewModelSimpleImpl('2');

      await vmStore.attach(vm1);
      await vmStore.attach(vm2);

      await vmStore.detach('1');
      await vmStore.detach('2');

      expect([...vmStore._viewModels.values()]).toHaveLength(0);
      expect([...vmStore._mountingViews.values()]).toHaveLength(0);
      expect([...vmStore._unmountingViews.values()]).toHaveLength(0);
      expect([...vmStore._linkedComponentVMClasses.values()]).toHaveLength(0);
      expect([...vmStore._instanceAttachedCount.values()]).toHaveLength(0);
      expect([...vmStore._viewModelIdsByClasses.values()]).toHaveLength(0);
    });

    it('should be found by .get() and id', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm = new ViewModelSimpleImpl('1000');

      await vmStore.attach(vm);

      expect(vmStore.get('1000')).toBe(vm);
    });

    it('should be found by .get() and class ref', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm = new ViewModelSimpleImpl('1000');

      await vmStore.attach(vm);

      expect(vmStore.get(ViewModelSimpleImpl)).toBe(vm);
    });
  });
});
