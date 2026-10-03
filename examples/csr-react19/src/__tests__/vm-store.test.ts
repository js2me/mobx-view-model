import { describe, expect, it } from 'vitest';
import type { RootStore } from '../stores/root-store';
import { VMStore } from '../shared/lib/vm-store';

describe('VMStore simple view models', () => {
  it('indexes and removes a simple VM without its own id', () => {
    class SimpleVM {
      id?: string;
    }

    const store = new VMStore({} as RootStore);
    const vm = store.define({ id: 'generated', VM: SimpleVM, payload: {} });

    expect(vm.id).toBe('generated');
    expect(store.get(SimpleVM)).toBe(vm);

    store.unmount(vm);
    expect(store.get('generated')).toBeNull();
    expect(store.get(SimpleVM)).toBeNull();
  });

  it('keeps a simple VM id supplied by its constructor', () => {
    class SimpleVM {
      id = 'custom';
    }

    const store = new VMStore({} as RootStore);
    const vm = store.define({ id: 'custom', VM: SimpleVM, payload: {} });

    expect(vm.id).toBe('custom');
    expect(store.get(SimpleVM)).toBe(vm);
  });
});
