import { action, computed, observable, runInAction, untracked } from 'mobx';
import type { ObservableAnnotationsArray } from 'yummies/mobx';
import type { Class, Maybe, MaybePromise } from 'yummies/types';
import {
  applyObservable,
  mergeVMConfigs,
  type ViewModelsConfig,
} from '../config/index.js';
import type { ViewModelBase } from './view-model.base.js';
import type { ViewModelStore } from './view-model.store.js';
import type {
  ViewModelCreateConfig,
  ViewModelAttachOptions,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
  ViewModelStoreConfig,
} from './view-model.store.types.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelParams,
} from './view-model.types.js';

const baseAnnotations: ObservableAnnotationsArray = [
  [computed, 'mountedViewsCount'],
    [
    action,
    'mount',
    'unmount',
    'attachVMConstructor',
    'attach',
    'detach',
    'link',
    'unlink',
  ],
];

export class ViewModelStoreBase<VMBase extends AnyViewModel = AnyViewModel>
  implements ViewModelStore<VMBase>
{
  protected viewModels: Map<string, VMBase | AnyViewModelSimple>;
  protected linkedAnchorVMClasses: Map<unknown, Class<VMBase>>;
  protected viewModelIdsByClasses: Map<
    Class<VMBase> | Class<AnyViewModelSimple>,
    string[]
  >;
  protected instanceAttachedCount: Map<string, number>;

  /**
   * It is temp heap which is needed to get access to view model instance before all initializations happens
   */
  protected viewModelsTempHeap: Map<string, VMBase>;

  /**
   * Views waiting for mount
   */
  protected mountingViews: Set<string>;

  /**
   * Views waiting for unmount
   */
  protected unmountingViews: Set<string>;

  public vmConfig: ViewModelsConfig;

  constructor(protected config?: ViewModelStoreConfig) {
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.viewModels = observable.map([], { deep: false });
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.linkedAnchorVMClasses = observable.map([], { deep: false });
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    // Shallow map: array updates go through `set()` so `push()` does not
    // notify observers that read `getIds()` during another component's render.
    this.viewModelIdsByClasses = observable.map([], { deep: false });
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.instanceAttachedCount = observable.map([], { deep: false });
    this.mountingViews = observable.set([], { deep: false });
    this.unmountingViews = observable.set([], { deep: false });
    this.vmConfig = mergeVMConfigs(config?.vmConfig);
    this.viewModelsTempHeap = new Map();

    applyObservable(
      this,
      baseAnnotations,
      this.vmConfig.observable.viewModelStores,
    );

    this.vmConfig.hooks.storeCreate(this as ViewModelStore);
  }

  get mountedViewsCount() {
    return [...this.instanceAttachedCount.values()].reduce(
      (sum, count) => sum + count,
      0,
    );
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#processcreateconfig-config)
   * Process the configuration for creating a view model.
   * This method is called just before creating a new view model instance.
   * It's useful for initializing the configuration, like linking anchors to the view model class.
   * @param config - The configuration for creating the view model.
   */
  processCreateConfig<VM extends VMBase>(
    config: ViewModelCreateConfig<VM>,
  ): void {
    const fromConfig = config.anchors ?? [];

    this.link(config.VM, config.component, ...fromConfig);
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#createviewmodel-config)
   * Creates a new view model instance based on the provided configuration.
   * @param config - The configuration for creating the view model.
   * @returns The newly created view model instance.
   */
  createViewModel<VM extends VMBase>(config: ViewModelCreateConfig<VM>): VM {
    const VMConstructor = config.VM as unknown as typeof ViewModelBase;
    const vmConfig = mergeVMConfigs(this.vmConfig, config.vmConfig);
    const vmParams: ViewModelParams<any, any> & ViewModelCreateConfig<VM> = {
      ...config,
      vmConfig,
    };

    if (vmConfig.factory) {
      return vmConfig.factory(vmParams) as VM;
    }

    return new VMConstructor(vmParams) as unknown as VM;
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#generateviewmodelid-config)
   * Generates a unique ID for a view model based on the provided configuration.
   * @param config - The configuration for generating the ID.
   * @returns The generated unique ID.
   */
  generateViewModelId<VM extends VMBase>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string {
    if (config.id) {
      return config.id;
    } else {
      return this.vmConfig.generateId({
        ...config.ctx,
        VM: config.VM,
        renderId: config.renderId,
      });
    }
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

    const registeredIds = this.viewModelIdsByClasses.get(viewModelClass) || [];

    const liveRegisteredIds = registeredIds.filter(
      (id) => this.viewModels.has(id) || this.viewModelsTempHeap.has(id),
    );

    if (liveRegisteredIds.length > 0) {
      return liveRegisteredIds;
    }

    // Instances pending registry still live in the non-observable temp heap.
    const pendingIds: string[] = [];
    for (const [id, vm] of this.viewModelsTempHeap) {
      if ((vm as VMBase).constructor === viewModelClass) {
        pendingIds.push(id);
      }
    }

    return pendingIds;
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

    return this.viewModels.has(id);
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#get-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The view model instance, or null if not found.
   */
  get<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T | null {
    // helps to users of this method to better observe changes in view models
    // this.viewModels.keys();

    const id = this.getId(vmLookup);

    if (!id) return null;

    const observedVM = this.viewModels.get(id) as Maybe<T>;

    return observedVM ?? (this.viewModelsTempHeap.get(id) as Maybe<T>) ?? null;
  }

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/base-implementation#getorcreatevmid-model)
   * @param model - View model instance whose `id` should be defined.
   * @returns Stable id for the instance (existing or newly generated).
   */
  getOrCreateVmId(model: VMBase | AnyViewModelSimple): string {
    if (!model.id) {
      (model as AnyViewModelSimple).id = this.vmConfig.generateId({
        VM: model.constructor,
      });
    }

    return model.id!;
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

  protected finalizeMount(modelId: string) {
    runInAction(() => {
      this.mountingViews.delete(modelId);
    });
  }

  /**
   * Puts the model in {@link mountingViews}, calls `model.mount()`, then {@link finalizeMount}.
   * {@link attach} delegates here so sync `mount()` finishes in the same turn as `attach` (SSR / first paint).
   *
   * Returns `void` when `model.mount()` is synchronous, otherwise a promise that settles after async mount.
   */
  protected mount(model: VMBase | AnyViewModelSimple): MaybePromise<void> {
    const modelId = this.getOrCreateVmId(model);

    this.mountingViews.add(modelId);

    try {
      const maybePromise = model.mount?.();

      if (maybePromise instanceof Promise) {
        return maybePromise
          .then(() => undefined)
          .finally(() => {
            this.finalizeMount(modelId);
          });
      } else {
        this.finalizeMount(modelId);
      }
    } catch (error) {
      this.finalizeMount(modelId);
      throw error;
    }
  }

  protected async unmount(model: VMBase | AnyViewModelSimple) {
    const modelId = this.getOrCreateVmId(model);

    this.unmountingViews.add(modelId);

    await model.unmount?.();

    runInAction(() => {
      this.unmountingViews.delete(modelId);
    });
  }

  protected attachVMConstructor(model: VMBase | AnyViewModelSimple) {
    const modelId = this.getOrCreateVmId(model);
    const constructor = (model as any).constructor as Class<any, any>;

    if (this.viewModelIdsByClasses.has(constructor)) {
      const vmIds = this.viewModelIdsByClasses.get(constructor)!;
      if (!vmIds.includes(modelId)) {
        this.viewModelIdsByClasses.set(constructor, [...vmIds, modelId]);
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

  markToBeAttached(model: VMBase | AnyViewModelSimple) {
    const modelId = this.getOrCreateVmId(model);

    this.viewModelsTempHeap.set(modelId, model as VMBase);

    if ('attachViewModelStore' in model) {
      model.attachViewModelStore!(this as ViewModelStore);
    }

    // Class registry (`viewModelIdsByClasses.set`) is deferred to finalize phase of
    // `attach()` so render-phase `markToBeAttached` does not notify observers
    // that resolve VMs by class during another attach.
  }

  /**
   * Registers the view model and runs `model.mount()` in the same stack when it is synchronous,
   * so SSR and the first client render can match without a separate API.
   *
   * If `mount()` returns a thenable, returns a `Promise` that settles after mount; the first paint
   * may still show fallback until then. Otherwise returns `void`.
   */
  attach(
    model: VMBase | AnyViewModelSimple,
    options?: ViewModelAttachOptions,
  ): MaybePromise<void> {
    if (options?.commitOnly) {
      const modelId = this.getOrCreateVmId(model);
      const attachedCount = this.instanceAttachedCount.get(modelId) ?? 0;
      if (attachedCount > 0) {
        this.finalizeAttachViewModel(model);
      }
      return;
    }

    const modelId = this.getOrCreateVmId(model);

    const attachedCount = this.instanceAttachedCount.get(modelId) ?? 0;

    this.instanceAttachedCount.set(modelId, attachedCount + 1);

    let mount: MaybePromise<void>;

    if (attachedCount > 0 || this.viewModels.has(modelId)) {
      if ('isMounted' in model && (model as VMBase).isMounted === false) {
        mount = this.mount(model);
      } else {
        mount = undefined;
      }
    } else {
      mount = this.mount(model);
    }

    if (!options?.deferCommit) {
      this.finalizeAttachViewModel(model);
    }

    return mount;
  }

  /** Writes the view model into the observable registry (idempotent). */
  private finalizeAttachViewModel(model: VMBase | AnyViewModelSimple): void {
    const modelId = this.getOrCreateVmId(model);

    if (!this.viewModels.has(modelId)) {
      this.viewModels.set(modelId, model);
    }

    this.attachVMConstructor(model);
    this.viewModelsTempHeap.delete(modelId);
  }

  async detach(id: string) {
    const attachedCount = this.instanceAttachedCount.get(id) ?? 0;

    if (attachedCount <= 0) {
      this.viewModelsTempHeap.delete(id);
      return;
    }

    const model =
      this.viewModels.get(id) ??
      (this.viewModelsTempHeap.get(id) as Maybe<VMBase | AnyViewModelSimple>);

    this.viewModelsTempHeap.delete(id);

    const nextInstanceAttachedCount = attachedCount - 1;

    if (nextInstanceAttachedCount > 0) {
      this.instanceAttachedCount.set(id, nextInstanceAttachedCount);
      return;
    }

    this.instanceAttachedCount.delete(id);

    if (!model) {
      return;
    }

    if (this.viewModels.has(id)) {
      this.viewModels.delete(id);
      this.dettachVMConstructor(model);
    }

    await this.unmount(model);
  }

  isAbleToRenderView(id: Maybe<string>): boolean {
    const isViewMounting = this.mountingViews.has(id!);
    const hasViewModel = untracked(
      () =>
        this.viewModels.has(id!) || this.viewModelsTempHeap.has(id!),
    );
    return !!id && hasViewModel && !isViewMounting;
  }

  clean(): void {
    this.viewModels.clear();
    this.linkedAnchorVMClasses.clear();
    this.viewModelIdsByClasses.clear();
    this.instanceAttachedCount.clear();
    this.mountingViews.clear();
    this.unmountingViews.clear();
    this.viewModelsTempHeap.clear();
  }
}
