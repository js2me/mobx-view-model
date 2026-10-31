import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';

type Model = AnyViewModel | AnyViewModelSimple;
type Ownership = { count: number; mountResult?: void | PromiseLike<void> };
const stores = new WeakMap<ViewModelStore, WeakMap<Model, Ownership>>();

export const retainModel = (store: ViewModelStore, model: Model) => {
  let entries = stores.get(store);
  if (!entries) {
    entries = new WeakMap();
    stores.set(store, entries);
  }
  let ownership = entries.get(model);
  if (!ownership) {
    ownership = { count: 0 };
    entries.set(model, ownership);
  }
  ownership.count++;
  return {
    ownership,
    release: () => {
      if (--ownership.count !== 0) return;
      entries.delete(model);
      // A stale owner must never remove a replacement registered under the same ID.
      if (!model.id || store.get(model.id) === model) void store.unmount(model);
      else void model.unmount?.();
    },
  };
};
