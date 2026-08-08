import { action, computed, observable, runInAction, untracked, when } from 'mobx';
import type { ObservableAnnotationsArray } from 'yummies/mobx';
import type { Class, Maybe } from 'yummies/types';
import {
  applyObservable,
  mergeVMConfigs,
  type ViewModelsConfig,
} from '../config/index.js';
import type { ViewModelStore } from './view-model.store.js';
import type {
  ViewModelCreateConfig,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
  ViewModelStoreConfig,
} from './view-model.store.types.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelParams,
} from './view-model.types.js';
import { isViewModel } from '../utils/typeguards.js';

const baseAnnotations: ObservableAnnotationsArray = [
  [computed, 'mountedViewsCount', 'hasMountingVms'],
  [action, 'link', 'unlink'],
];

type StagedViewModelEntry<VMBase extends AnyViewModel = AnyViewModel> = {
  vm: VMBase | AnyViewModelSimple;
  /** Creation order marker — see {@link ViewModelStoreBase.sweepStaged}. */
  epoch: number;
};

type StagedVmRegistryEntry = {
  store: ViewModelStoreBase<any>;
  id: string;
  vm: AnyViewModel | AnyViewModelSimple;
};

/**
 * GC-driven backstop for staged entries whose owner was discarded without
 * committing (e.g. a React fiber thrown away during a render pass). The
 * owner object (the view layer's per-fiber cache) is the finalization
 * target: once it is collected, the staged entry is dropped.
 */
const stagedVmRegistry: FinalizationRegistry<StagedVmRegistryEntry> | null =
  typeof FinalizationRegistry === 'function'
    ? new FinalizationRegistry<StagedVmRegistryEntry>(({ store, id, vm }) => {
        store.dropStaged(id, vm);
      })
    : null;

export class ViewModelStoreBase<VMBase extends AnyViewModel = AnyViewModel>
  implements ViewModelStore<VMBase>
{
  protected viewModels: Map<string, VMBase | AnyViewModelSimple>;
  protected linkedAnchorVMClasses: Map<unknown, Class<VMBase>>;
  protected viewModelIdsByClasses: Map<
    Class<VMBase> | Class<AnyViewModelSimple>,
    string[]
  >;
  /**
   * VMs registered by the view layer during render (see {@link defineStaged}).
   * Visible to lookups via read-through, but not committed store members:
   * {@link mountedViewsCount}, {@link hasMountingVms} and {@link waitMount}
   * ignore them. Promoted to {@link viewModels} by {@link commitStaged};
   * dropped by {@link sweepStaged} / {@link dropStaged} when the owning
   * render is discarded.
   *
   * Intentionally NOT observable: staging writes happen during render and
   * must not notify store observers.
   */
  protected stagedViewModels: Map<string, StagedViewModelEntry<VMBase>>;
  private stagedEpoch = 0;
  private stagedSweepScheduled = false;

  public vmConfig: ViewModelsConfig;
  public resource: ViewModelStoreConfig['resource'];

  constructor(protected config?: ViewModelStoreConfig) {
    // TODO: remove before merge — link-verification marker
    console.info('[mobx-view-model] feat/staged-vm-commit build linked');
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.viewModels = observable.map([], { deep: false });
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.linkedAnchorVMClasses = observable.map([], { deep: false });
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.viewModelIdsByClasses = observable.map([], { deep: true });
    this.stagedViewModels = new Map();
    this.vmConfig = mergeVMConfigs(config?.vmConfig);
    this.resource = config?.resource ?? this.vmConfig.resource;

    applyObservable(
      this,
      baseAnnotations,
      this.vmConfig.observable.viewModelStores,
    );

    this.vmConfig.hooks.storeCreate(this as ViewModelStore);
  }

  get mountedViewsCount() {
    let count = 0;
    for (const vm of this.viewModels.values()) {
      if (!isViewModel(vm) || vm.isMounted) {
        count += 1;
      }
    }
    return count;
  }

  get hasMountingVms() {
    return [...this.viewModels.values()].some(
      (vm) => isViewModel(vm) && !vm.isMounted,
    );
  }

  waitMount(...vms: (AnyViewModel | AnyViewModelSimple)[]): Promise<void> {
    return when(() => {
      if (vms.length) {
        return vms.every((vm) => !isViewModel(vm) || vm.isMounted);
      }
      return [...this.viewModels.values()].every(
        (vm) => !isViewModel(vm) || vm.isMounted,
      );
    });
  }

  connect(
    instance: AnyViewModel | AnyViewModelSimple,
    config: ViewModelCreateConfig<any>,
  ): void {
    this.link(config.VM, ...(config.anchors ?? []));
    this.viewModels.set(config.id, instance!);
    this.attachVMConstructor(instance);

    instance.init?.({ ...config, viewModels: this });
  }

  /**
   * Defines a view model: returns the existing instance if one with the same ID
   * is already registered, otherwise creates a new instance, connects it to the
   * store, and returns it.
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#define)
   */
  define<VM extends VMBase | AnyViewModelSimple>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    config.id = this.generateId(config);

    const existing = untracked(() => this.viewModels.get(config.id)) as
      | VM
      | undefined;

    if (existing) {
      return existing;
    }

    const staged = this.stagedViewModels.get(config.id);

    if (staged) {
      // A staged entry with this id exists: promote it instead of creating a
      // second instance. `init` already ran in `defineStaged`, so promotion
      // only moves the entry into the committed map (no re-init, no sweep —
      // `define` may run during a view-layer render pass).
      this.stagedViewModels.delete(config.id);
      stagedVmRegistry?.unregister(staged.vm);
      runInAction(() => {
        this.viewModels.set(config.id, staged.vm);
        this.attachVMConstructor(staged.vm);
      });

      return staged.vm as VM;
    }

    const instance = this.create(config);

    this.connect(instance, config);

    return instance;
  }

  /**
   * Staging variant of {@link define}: creates (or returns) the instance and
   * makes it visible to store lookups immediately (read-through), but does
   * NOT commit it as a store entry. The view layer must call
   * {@link commitStaged} once the owner is known to be alive (e.g. from a
   * React commit effect). If `owner` is garbage-collected without ever
   * committing, the staged entry is dropped automatically.
   *
   * This mirrors the view layer's own work-in-progress → commit model:
   * work done for a discarded render never becomes committed store state,
   * so no orphan cleanup of committed entries is needed.
   */
  defineStaged<VM extends VMBase | AnyViewModelSimple>(
    config: ViewModelCreateConfig<VM>,
    owner: object,
  ): VM {
    config.id = this.generateId(config);

    const existing = untracked(
      () =>
        this.viewModels.get(config.id) ??
        this.stagedViewModels.get(config.id)?.vm,
    ) as VM | undefined;

    if (existing) {
      return existing;
    }

    const instance = this.create(config);

    this.link(config.VM as Class<VMBase>, ...(config.anchors ?? []));
    instance.init?.({ ...config, viewModels: this } as any);

    this.stagedViewModels.set(config.id, {
      vm: instance,
      epoch: ++this.stagedEpoch,
    });
    stagedVmRegistry?.register(
      owner,
      { store: this, id: config.id, vm: instance },
      instance,
    );

    return instance;
  }

  /**
   * Promotes a staged view model to a committed store entry. Safe to call
   * with an instance whose staged entry is already gone (e.g. swept): the
   * instance is simply (re)registered as committed. Also schedules a sweep
   * of staged leftovers from the current render pass — call this only from
   * commit-phase code (effects), never during render.
   */
  commitStaged(id: string, instance?: VMBase | AnyViewModelSimple): void {
    const vm = instance ?? this.stagedViewModels.get(id)?.vm;

    if (!vm) {
      return;
    }

    const staged = this.stagedViewModels.get(id);

    if (staged?.vm === vm) {
      this.stagedViewModels.delete(id);
      stagedVmRegistry?.unregister(vm);
    }

    if (untracked(() => this.viewModels.get(id)) !== vm) {
      runInAction(() => {
        this.viewModels.set(id, vm);
        this.attachVMConstructor(vm);
      });
    }

    this.scheduleStagedSweep();
  }

  /**
   * Drops a staged entry if it still belongs to the given instance.
   * The identity check protects against id reuse: a new VM staged under the
   * same id must not be removed by a stale finalizer.
   */
  dropStaged(id: string, instance: VMBase | AnyViewModelSimple): void {
    if (this.stagedViewModels.get(id)?.vm === instance) {
      this.stagedViewModels.delete(id);
      stagedVmRegistry?.unregister(instance);
    }
  }

  /**
   * Removes staged entries created up to (and including) the render pass
   * that produced the latest commit; entries created by later passes
   * survive. Dropping is lifecycle-free and safe for live owners: their
   * commit effect re-registers the instance via {@link commitStaged}.
   */
  protected sweepStaged(epochAtCommit: number): void {
    for (const [id, entry] of this.stagedViewModels) {
      if (entry.epoch <= epochAtCommit) {
        this.stagedViewModels.delete(id);
        stagedVmRegistry?.unregister(entry.vm);
      }
    }
  }

  private scheduleStagedSweep(): void {
    if (this.stagedSweepScheduled) {
      return;
    }
    this.stagedSweepScheduled = true;
    const epochAtCommit = this.stagedEpoch;
    setTimeout(() => {
      this.stagedSweepScheduled = false;
      this.sweepStaged(epochAtCommit);
    });
  }

  unmount(instance: VMBase | AnyViewModelSimple) {
    instance.unmount?.();
    this.dettachVMConstructor(instance);
    if (instance.id) {
      this.viewModels.delete(instance.id);
    }
    // The staged key may differ from `instance.id` (ViewModelSimple manages
    // its own id), so drop by identity.
    for (const [id, entry] of this.stagedViewModels) {
      if (entry.vm === instance) {
        this.stagedViewModels.delete(id);
        break;
      }
    }
    stagedVmRegistry?.unregister(instance);
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#createviewmodel-config)
   * Creates a new view model instance based on the provided configuration.
   * @param config - The configuration for creating the view model.
   * @returns The newly created view model instance.
   */
  create<VM extends VMBase | AnyViewModelSimple>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    const vmConfig = mergeVMConfigs(this.vmConfig, config.vmConfig);
    const vmParams: ViewModelParams<any, any> & ViewModelCreateConfig<VM> = {
      ...config,
      vmConfig,
    };

    return (config?.factory?.(config) ?? vmConfig.factory(vmParams)) as VM;
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#generateid-config)
   * Generates a unique ID for a view model based on the provided configuration.
   * @param config - The configuration for generating the ID.
   * @returns The generated unique ID.
   */
  generateId<VM extends VMBase | AnyViewModelSimple>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string {
    return config.id;
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#link)
   * Link anchors (React components) with view model class.
   * @param VM - The view model class to link to.
   * @param anchors - The anchors to link.
   */
  link(VM: Class<VMBase>, ...anchors: Maybe<unknown>[]): void {
    anchors.forEach((anchor) => {
      if (anchor && !this.linkedAnchorVMClasses.has(anchor)) {
        this.linkedAnchorVMClasses.set(anchor, VM);
      }
    });
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#unlink)
   * Unlink anchors (React components) with view model class.
   * @param anchors - The anchors to unlink.
   */
  unlink(...anchors: Maybe<unknown>[]): void {
    anchors.forEach((anchor) => {
      if (anchor && this.linkedAnchorVMClasses.has(anchor)) {
        this.linkedAnchorVMClasses.delete(anchor);
      }
    });
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getids-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The IDs of the view models
   */
  getIds<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): string[] {
    if (!vmLookup) return [];

    if (typeof vmLookup === 'string') {
      return [vmLookup];
    }

    const viewModelClass = (this.linkedAnchorVMClasses.get(vmLookup as any) ||
      vmLookup) as Class<T>;

    const viewModelIds = [
      ...(this.viewModelIdsByClasses.get(viewModelClass) || []),
    ];

    // Read-through: staged entries are visible to lookups (created during
    // the current render pass, not yet committed).
    for (const [id, entry] of this.stagedViewModels) {
      if (
        (entry.vm as any).constructor === viewModelClass &&
        !viewModelIds.includes(id)
      ) {
        viewModelIds.push(id);
      }
    }

    return viewModelIds;
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getid-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The ID of the view model, or null if not found.
   */
  getId<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): string | null {
    const viewModelIds = this.getIds(vmLookup);

    if (viewModelIds.length === 0) return null;

    if (process.env.NODE_ENV !== 'production' && viewModelIds.length > 1) {
      console.warn(
        `Found more than 1 view model with the same identifier. Last instance will been returned`,
      );
    }

    return viewModelIds.at(-1)!;
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#has-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns True if the instance exists, false otherwise.
   */
  has<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): boolean {
    const id = this.getId(vmLookup);

    if (!id) return false;

    return this.viewModels.has(id) || this.stagedViewModels.has(id);
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#get-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The view model instance, or null if not found.
   */
  get<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T | null {
    const id = this.getId(vmLookup);

    if (!id) return null;

    return (
      ((this.viewModels.get(id) ?? this.stagedViewModels.get(id)?.vm) as
        | Maybe<T>
        | undefined) ?? null
    );
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getall-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns All view model instances matching the lookup.
   */
  getAll<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T[] {
    const viewModelIds = this.getIds(vmLookup);

    return viewModelIds.map((id) => this.viewModels.get(id) as T);
  }

  /**
   * Indexes the instance id by its class so `get(CartPageVM)` / `useViewModel(CartPageVM)` work.
   */
  protected attachVMConstructor(model: VMBase | AnyViewModelSimple) {
    const constructor = (model as any).constructor as Class<any, any>;
    const modelId = model.id!;
    const vmIds = this.viewModelIdsByClasses.get(constructor);

    if (vmIds) {
      if (!vmIds.includes(modelId)) {
        vmIds.push(modelId);
      }
    } else {
      this.viewModelIdsByClasses.set(constructor, [modelId]);
    }
  }

  protected dettachVMConstructor(model: VMBase | AnyViewModelSimple) {
    const constructor = (model as any).constructor as Class<any, any>;

    if (this.viewModelIdsByClasses.has(constructor)) {
      const vmIds = this.viewModelIdsByClasses
        .get(constructor)!
        .filter((it) => it !== model.id);

      if (vmIds.length > 0) {
        this.viewModelIdsByClasses.set(constructor, vmIds);
      } else {
        this.viewModelIdsByClasses.delete(constructor);
      }
    }
  }

  clean(): void {
    for (const entry of this.stagedViewModels.values()) {
      stagedVmRegistry?.unregister(entry.vm);
    }
    this.stagedViewModels.clear();
    this.viewModels.clear();
    this.linkedAnchorVMClasses.clear();
    this.viewModelIdsByClasses.clear();
  }
}
