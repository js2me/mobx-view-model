import { ViewModelStoreBase, type ViewModelSimple } from 'mobx-view-model';
import { expect, test, vi } from 'vitest';
import { acquireVm, releaseVm } from './pending-vm-unmount.js';

class SimpleVM implements ViewModelSimple {
  id = 'shared';
  unmount = vi.fn();
}

test('abandoned and committed renders each release only their own reference', async () => {
  // Deliver collection notifications deterministically instead of waiting for GC.
  let finalize!: (vm: SimpleVM) => void;
  const unregister = vi.fn(() => true);
  const register = vi.fn();
  vi.stubGlobal('FinalizationRegistry', class {
    constructor(callback: typeof finalize) { finalize = callback; }
    register = register;
    unregister = unregister;
  });
  vi.resetModules();
  try {
    const pending = await import('./pending-vm-unmount.js');
    const vm = new SimpleVM();
    const hidden = {};
    pending.registerUnconfirmed(vm, {});
    pending.registerUnconfirmed(vm, hidden);
    expect(register).toHaveBeenCalledWith(hidden, vm, hidden);
    finalize(vm);
    expect(vm.unmount).not.toHaveBeenCalled();
    pending.acquireVm(vm, null, hidden);
    expect(unregister).toHaveBeenCalledWith(hidden);
    pending.releaseVm(vm);
    expect(vm.unmount).toHaveBeenCalledTimes(1);

    // The committed store owner leaves while a second render is still pending.
    const store = new ViewModelStoreBase();
    const shared = store.define({ id: 'shared', VM: SimpleVM, payload: {} });
    pending.acquireVm(shared, store);
    pending.registerUnconfirmed(shared, {});
    pending.releaseVm(shared);
    expect(shared.unmount).not.toHaveBeenCalled();
    finalize(shared);
    expect(shared.unmount).toHaveBeenCalledTimes(1);
    expect(store.get('shared')).toBeNull();

    const orphan = new SimpleVM();
    pending.registerUnconfirmed(orphan, {});
    finalize(orphan);
    expect(orphan.unmount).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
    vi.resetModules();
  }
});

test('only the last committed owner unmounts a VM and preserves its replacement', () => {
  const store = new ViewModelStoreBase();
  const vm = store.define({ id: 'shared', VM: SimpleVM, payload: {} });
  acquireVm(vm, store);
  acquireVm(vm, store);
  releaseVm(vm);
  expect(vm.unmount).not.toHaveBeenCalled();
  const replacement = new SimpleVM();
  store.connect(replacement, { id: 'shared', VM: SimpleVM, payload: {} });
  releaseVm(vm);
  releaseVm(vm);
  expect(vm.unmount).toHaveBeenCalledTimes(1);
  expect(store.get('shared')).toBe(replacement);
});
