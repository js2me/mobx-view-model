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
  renderStore: ViewModelStore;
  entries: Map<string, StagedVm>;
  epoch: number;
  sweepScheduled: boolean;
};

type StagedRegistryEntry = {
  entries: StagedStore['entries'];
  id: string;
  vm: VmInstance;
};

// Render-phase VMs belong to the React integration, not to ViewModelStore.
// They are intentionally absent from store lookups until their fiber commits.
const stagedStores = new WeakMap<ViewModelStore, StagedStore>();

/** Releases a VM whose React fiber was discarded before it could commit. */
const stagedVmRegistry: FinalizationRegistry<StagedRegistryEntry> | null =
  typeof FinalizationRegistry === 'function'
    ? new FinalizationRegistry<StagedRegistryEntry>(({ entries, id, vm }) => {
        if (entries.get(id)?.vm === vm) entries.delete(id);
      })
    : null;

/** Lookup used by React hooks while a sibling VM is still in render phase. */
export const getRenderPhaseViewModel = <T extends VmInstance>(
  store: ViewModelStore,
  lookup: unknown,
  entries = stagedStores.get(store)?.entries,
): T | null => {
  let vm: VmInstance | undefined;
  if (typeof lookup === 'string') {
    vm = entries?.get(lookup)?.vm;
  } else if (entries) {
    for (const entry of entries.values()) {
      if (matchesLookup(entry, lookup)) {
        vm = entry.vm;
      }
    }
  }
  return (vm ?? store.get(lookup as any)) as T | null;
};

const matchesLookup = ({ config }: StagedVm, lookup: unknown) =>
  config.VM === lookup || config.anchors?.includes(lookup);

const createRenderPhaseStore = (
  store: ViewModelStore,
  entries: StagedStore['entries'],
): ViewModelStore => {
  const methods = {
    get: <T extends VmInstance>(lookup: unknown): T | null =>
      getRenderPhaseViewModel<T>(store, lookup, entries),
    has: (lookup: unknown): boolean => methods.get(lookup) != null,
    getIds: (lookup: unknown): string[] => {
      const ids = store.getIds(lookup as any);
      if (typeof lookup === 'string' || !entries.size) return ids;
      // Map keys are unique, so only committed IDs can overlap.
      const committed = ids.length ? new Set(ids) : undefined;
      for (const [id, entry] of entries) {
        if (matchesLookup(entry, lookup) && !committed?.has(id)) ids.push(id);
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

  let stagedStore = stagedStores.get(store);
  if (!stagedStore) {
    const entries = new Map<string, StagedVm>();
    stagedStore = {
      entries,
      renderStore: createRenderPhaseStore(store, entries),
      epoch: 0,
      sweepScheduled: false,
    };
    stagedStores.set(store, stagedStore);
  }
  const staged = stagedStore.entries.get(config.id);
  if (staged) return staged.vm;

  const vm = store.create({
    ...config,
    viewModels: stagedStore.renderStore,
  }) as VmInstance;
  stagedStore.entries.set(config.id, { vm, config, epoch: ++stagedStore.epoch });
  stagedVmRegistry?.register(owner, { entries: stagedStore.entries, id: config.id, vm }, vm);
  return vm;
};

/** Registers a render-phase VM after React has committed its owning fiber. */
export const commitStagedViewModel = (
  store: ViewModelStore,
  config: ViewModelCreateConfig<any>,
  vm: VmInstance,
): void => {
  const stagedStore = stagedStores.get(store);
  if (stagedStore?.entries.get(config.id)?.vm === vm) {
    stagedStore.entries.delete(config.id);
  }
  stagedVmRegistry?.unregister(vm);

  // Two committed fibers may share an explicit ID and the same staged VM.
  // connect() invokes init(), so it must run only for the first commit.
  if (store.get(config.id) !== vm) {
    runInAction(() => store.connect(vm, config));
  }
  if (stagedStore?.entries.size && !stagedStore.sweepScheduled) {
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
  }
};
