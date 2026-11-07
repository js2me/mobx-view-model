import { ViewModelStoreBase, type ViewModelSimple } from 'mobx-view-model';
import { afterEach, expect, test, vi } from 'vitest';
import { acquireVm, registerUnconfirmed, releaseVm } from './pending-vm-unmount.js';

class SimpleVM implements ViewModelSimple {
  id = 'shared';
  unmount = vi.fn();
}

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});

test('cleans deduplicated no-store orphans only after a commit', () => {
  vi.useFakeTimers();
  const orphan = new SimpleVM();
  const committed = new SimpleVM();
  registerUnconfirmed(orphan);
  registerUnconfirmed(orphan);
  const entry = registerUnconfirmed(committed);
  expect(vi.getTimerCount()).toBe(0);

  acquireVm(entry, true);
  expect(orphan.unmount).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(orphan.unmount).toHaveBeenCalledTimes(1);
  expect(committed.unmount).not.toHaveBeenCalled();
});

test('a VM committed before the cleanup timer runs survives the sweep', () => {
  vi.useFakeTimers();
  const first = registerUnconfirmed(new SimpleVM());
  const second = registerUnconfirmed(new SimpleVM());
  const third = registerUnconfirmed(new SimpleVM());
  acquireVm(first, true);
  acquireVm(second, true);
  expect(vi.getTimerCount()).toBe(1);
  acquireVm(third, true);
  vi.runAllTimers();
  for (const vm of [first, second, third]) expect(vm.unmount).not.toHaveBeenCalled();
});

test('only the last committed owner unmounts a VM and preserves its replacement', () => {
  vi.useFakeTimers();
  const store = new ViewModelStoreBase();
  const vm = store.define({ id: 'shared', VM: SimpleVM, payload: {} });
  acquireVm(vm);
  acquireVm(vm);
  releaseVm(vm, store);
  expect(vm.unmount).not.toHaveBeenCalled();
  const replacement = new SimpleVM();
  store.connect(replacement, { id: 'shared', VM: SimpleVM, payload: {} });
  releaseVm(vm, store);
  releaseVm(vm, store);
  expect(vm.unmount).toHaveBeenCalledTimes(1);
  expect(store.get('shared')).toBe(replacement);
});
