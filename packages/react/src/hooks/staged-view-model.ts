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
  renderStore?: ViewModelStore;
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
        if (stagedStore?.entries.get(id)?.vm === vm) {
          stagedStore.entries.delete(id);
        }
      })
    : null;

const getStagedStore = (store: ViewModelStore): StagedStore => {
  let stagedStore = stagedStores.get(store);
  if (!stagedStore) {
    stagedStore = {
      entries: new Map(),
      epoch: 0,
      sweepScheduled: false,
    };
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

  let result: T | null = null;
  for (const entry of stagedStore.entries.values()) {
    if (entry.config.VM === lookup || entry.config.anchors?.includes(lookup)) {
      result = entry.vm as T;
    }
  }
  return result;
};

/** Lookup used by React hooks while a sibling VM is still in render phase. */
export const getRenderPhaseViewModel = <T extends VmInstance>(
  store: ViewModelStore,
  lookup: unknown,
): T | null => getStaged<T>(store, lookup) ?? (store.get(lookup as any) as T | null);

const createRenderPhaseStore = (store: ViewModelStore): ViewModelStore => {
  const methods = {
    get: <T extends VmInstance>(lookup: unknown): T | null =>
      getRenderPhaseViewModel<T>(store, lookup),
    has: (lookup: unknown): boolean => methods.get(lookup) != null,
    getIds: (lookup: unknown): string[] => {
      const ids = store.getIds(lookup as any);
      if (typeof lookup !== 'string') {
        for (const [id, entry] of stagedStores.get(store)!.entries) {
          if (
            (entry.config.VM === lookup || entry.config.anchors?.includes(lookup)) &&
            !ids.includes(id)
          ) {
            ids.push(id);
          }
        }
      }
      return ids;
    },
    getId: (lookup: unknown): string | null => methods.getIds(lookup).at(-1) ?? null,
    getAll: <T extends VmInstance>(lookup: unknown): T[] => {
      const instances: T[] = [];
      for (const id of methods.getIds(lookup)) {
        const vm = methods.get<T>(id);
        if (vm != null) instances.push(vm);
      }
      return instances;
    },
  };
  return new Proxy(store, {
    get(target, property, receiver) {
      return Object.hasOwn(methods, property)
        ? methods[property as keyof typeof methods]
        : Reflect.get(target, property, receiver);
    },
  });
};

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
    viewModels: (stagedStore.renderStore ??= createRenderPhaseStore(store)),
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

  // Two committed fibers may share an explicit ID and the same staged VM.
  // connect() invokes init(), so it must run only for the first commit.
  if (store.get(config.id) !== vm) {
    runInAction(() => store.connect(vm, config));
  }
  scheduleSweep(stagedStore);
};
