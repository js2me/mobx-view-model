import { describe, expect, it, vi } from 'vitest';
import type { ViewModelInitConfig } from './index.js';
import { ViewModelStoreBaseMock } from './view-model.store.base.test.js';
import type { ViewModelSimple } from './view-model-simple.js';

class ViewModelSimpleImpl implements ViewModelSimple<{ test: number }> {
  spies = {
    mount: vi.fn(),
    init: vi.fn(),
    setPayload: vi.fn(),
    unmount: vi.fn(),
  };

  id: string;

  constructor(id: string = '1') {
    this.id = id;
  }

  init(config: ViewModelInitConfig<this>): void {
    this.spies.init(config);
  }

  mount(): void {
    this.spies.mount();
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

  it('has id (user defined)', () => {
    const vm = new ViewModelSimpleImpl();
    expect(vm.id).toBe('1');
  });

  describe('work with vm store', () => {
    it('should call init on connect/define', () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm = vmStore.define({
        id: '1',
        VM: ViewModelSimpleImpl,
        payload: { test: 1 },
        factory: () => new ViewModelSimpleImpl('1'),
      });

      expect(vm.spies.init).toBeCalledTimes(1);
      expect(vm.spies.init.mock.calls[0]![0].viewModels).toBe(vmStore);
    });

    it('should register simple vm via define', () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm1 = vmStore.define({
        id: '1',
        VM: ViewModelSimpleImpl,
        payload: { test: 1 },
        factory: () => new ViewModelSimpleImpl('1'),
      });
      const vm2 = vmStore.define({
        id: '2',
        VM: ViewModelSimpleImpl,
        payload: { test: 2 },
        factory: () => new ViewModelSimpleImpl('2'),
      });

      expect([...vmStore._viewModels.values()]).toHaveLength(2);
      expect([...vmStore._linkedAnchorVMClasses.values()]).toHaveLength(0);
      expect([...vmStore._viewModelIdsByClasses.values()]).toHaveLength(1);
      expect(vmStore.get('1')).toBe(vm1);
      expect(vmStore.get('2')).toBe(vm2);
    });

    it('should remove simple vm via unmountNew', () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm1 = vmStore.define({
        id: '1',
        VM: ViewModelSimpleImpl,
        payload: { test: 1 },
        factory: () => new ViewModelSimpleImpl('1'),
      });
      const vm2 = vmStore.define({
        id: '2',
        VM: ViewModelSimpleImpl,
        payload: { test: 2 },
        factory: () => new ViewModelSimpleImpl('2'),
      });

      vmStore.unmountNew(vm1);
      vmStore.unmountNew(vm2);

      expect(vm1.spies.unmount).toBeCalledTimes(1);
      expect(vm2.spies.unmount).toBeCalledTimes(1);
      expect([...vmStore._viewModels.values()]).toHaveLength(0);
      expect([...vmStore._linkedAnchorVMClasses.values()]).toHaveLength(0);
      expect([...vmStore._viewModelIdsByClasses.values()]).toHaveLength(0);
    });

    it('should be found by .get() and id', () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm = vmStore.define({
        id: '1000',
        VM: ViewModelSimpleImpl,
        payload: { test: 1 },
        factory: () => new ViewModelSimpleImpl('1000'),
      });

      expect(vmStore.get('1000')).toBe(vm);
    });

    it('should be found by .get() and class ref', () => {
      const vmStore = new ViewModelStoreBaseMock();
      const vm = vmStore.define({
        id: '1000',
        VM: ViewModelSimpleImpl,
        payload: { test: 1 },
        factory: () => new ViewModelSimpleImpl('1000'),
      });

      expect(vmStore.get(ViewModelSimpleImpl)).toBe(vm);
    });
  });
});
