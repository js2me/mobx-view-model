import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelStore,
} from 'mobx-view-model';
import { runInAction } from 'mobx';

type VmInstance = AnyViewModel | AnyViewModelSimple;

type StagedVm = {
  vm: VmInstance;
  config: ViewModelCreateConfig<any>;
  epoch: number;
};

type StagedStore = {
  entries: Map<string, StagedVm>;
  epoch: number;
  sweepScheduled: boolean;
};

type StagedRegistryEntry = {
  store: ViewModelStore;
  id: string;
  vm: VmInstance;
};

// Render-phase VMs belong to the React integration, not to ViewModelStore.
// They are intentionally absent from store lookups until their fiber commits.
const stagedStores = new WeakMap<ViewModelStore, StagedStore>();

/** Releases a VM whose React fiber was discarded before it could commit. */
const stagedVmRegistry: FinalizationRegistry<StagedRegistryEntry> | null =
  typeof FinalizationRegistry === 'function'
    ? new FinalizationRegistry<StagedRegistryEntry>(({ store, id, vm }) => {
        const stagedStore = stagedStores.get(store);
        const staged = stagedStore?.entries.get(id);
        if (staged?.vm === vm) {
          stagedStore?.entries.delete(id);
        }
      })
    : null;

const getStagedStore = (store: ViewModelStore): StagedStore => {
  let stagedStore = stagedStores.get(store);
  if (!stagedStore) {
    stagedStore = { entries: new Map(), epoch: 0, sweepScheduled: false };
    stagedStores.set(store, stagedStore);
  }
  return stagedStore;
};

const getStaged = <T extends VmInstance>(
  store: ViewModelStore,
  lookup: unknown,
): T | null => {
  const stagedStore = stagedStores.get(store);
  if (!stagedStore) return null;

  if (typeof lookup === 'string') {
    return (stagedStore.entries.get(lookup)?.vm as T | undefined) ?? null;
  }

  for (const entry of [...stagedStore.entries.values()].reverse()) {
    if (entry.config.VM === lookup || entry.config.anchors?.includes(lookup)) {
      return entry.vm as T;
    }
  }
  return null;
};

/** Lookup used by React hooks while a sibling VM is still in render phase. */
export const getRenderPhaseViewModel = <T extends VmInstance>(
  store: ViewModelStore,
  lookup: unknown,
): T | null => (store.get(lookup as any) as T | null) ?? getStaged<T>(store, lookup);

const createRenderPhaseStore = (store: ViewModelStore): ViewModelStore =>
  new Proxy(store, {
    get(target, property, receiver) {
      if (property === 'get') {
        return <T extends VmInstance>(lookup: unknown): T | null =>
          getRenderPhaseViewModel<T>(target, lookup);
      }
      if (property === 'has') {
        return (lookup: unknown): boolean =>
          getRenderPhaseViewModel(target, lookup) != null;
      }
      if (property === 'getIds') {
        return (lookup: unknown): string[] => {
          const ids = target.getIds(lookup as any);
          if (typeof lookup === 'string') return ids;
          const stagedStore = stagedStores.get(target);
          for (const [id, entry] of stagedStore?.entries ?? []) {
            if (
              (entry.config.VM === lookup ||
                entry.config.anchors?.includes(lookup)) &&
              !ids.includes(id)
            ) {
              ids.push(id);
            }
          }
          return ids;
        };
      }
      if (property === 'getId') {
        return (lookup: unknown): string | null => {
          const ids = (receiver as ViewModelStore).getIds(lookup as any);
          return ids.at(-1) ?? null;
        };
      }
      if (property === 'getAll') {
        return <T extends VmInstance>(lookup: unknown): T[] =>
          (receiver as ViewModelStore)
            .getIds(lookup as any)
            .map((id) => getRenderPhaseViewModel<T>(target, id))
            .filter((vm): vm is T => vm != null);
      }
      return Reflect.get(target, property, receiver);
    },
  });

export const stageViewModel = (
  store: ViewModelStore,
  config: ViewModelCreateConfig<any>,
  owner: object,
): VmInstance => {
  config.id = store.generateId(config);
  const existing = store.get(config.id) as VmInstance | null;
  if (existing) return existing;

  const stagedStore = getStagedStore(store);
  const staged = stagedStore.entries.get(config.id);
  if (staged) return staged.vm;

  const vm = store.create({
    ...config,
    viewModels: createRenderPhaseStore(store),
  }) as VmInstance;
  stagedStore.entries.set(config.id, { vm, config, epoch: ++stagedStore.epoch });
  stagedVmRegistry?.register(owner, { store, id: config.id, vm }, vm);
  return vm;
};

const scheduleSweep = (stagedStore: StagedStore) => {
  if (stagedStore.sweepScheduled) return;
  stagedStore.sweepScheduled = true;
  const epochAtCommit = stagedStore.epoch;
  setTimeout(() => {
    stagedStore.sweepScheduled = false;
    for (const [id, entry] of stagedStore.entries) {
      if (entry.epoch <= epochAtCommit) {
        stagedStore.entries.delete(id);
        stagedVmRegistry?.unregister(entry.vm);
      }
    }
  });
};

/** Registers a render-phase VM after React has committed its owning fiber. */
export const commitStagedViewModel = (
  store: ViewModelStore,
  config: ViewModelCreateConfig<any>,
  vm: VmInstance,
): void => {
  const stagedStore = getStagedStore(store);
  if (stagedStore.entries.get(config.id)?.vm === vm) {
    stagedStore.entries.delete(config.id);
  }
  stagedVmRegistry?.unregister(vm);

  runInAction(() => {
    store.define({ ...config, factory: () => vm });
  });
  scheduleSweep(stagedStore);
};
