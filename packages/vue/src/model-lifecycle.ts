import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { isViewModel, viewModelsConfig } from 'mobx-view-model';
import { onBeforeUnmount, onMounted, onServerPrefetch } from 'vue';

type Model = AnyViewModel | AnyViewModelSimple;
type Ownership = { users: number; mounted?: void | PromiseLike<void> };
const stores = new WeakMap<ViewModelStore, WeakMap<Model, Ownership>>();
const mountModel = (model: Model) =>
  isViewModel(model) && model.isMounted ? undefined : model.mount?.();

const acquireModel = (store: ViewModelStore, model: Model) => {
  let models = stores.get(store);
  if (!models) {
    models = new WeakMap();
    stores.set(store, models);
  }
  let ownership = models.get(model);
  if (!ownership) {
    ownership = { users: 0 };
    models.set(model, ownership);
  }
  if (++ownership.users === 1) ownership.mounted = mountModel(model);
  return {
    mounted: ownership.mounted,
    release: () => {
      if (--ownership.users !== 0) return;
      models.delete(model);
      // Never unregister a replacement stored under the same ID.
      if (!model.id || store.get(model.id) === model) void store.unmount(model);
      else void model.unmount?.();
    },
  };
};

/** Start mounting once and release the model when its final Vue owner leaves. */
export const useModelLifecycle = (
  model: Model,
  store: ViewModelStore | null,
) => {
  const owner = store
    ? acquireModel(store, model)
    : {
        mounted: mountModel(model),
        release: () => {
          void model.unmount?.();
        },
      };
  // Route async client errors through Vue and await SSR mounting before rendering.
  onMounted(() => owner.mounted);
  onServerPrefetch(async () => {
    if (viewModelsConfig.mode === 'ssr') await owner.mounted;
  });
  onBeforeUnmount(owner.release);
};
