import { action, computed, observable, untracked, when } from 'mobx';
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
import { isViewModel, isViewModelSimple } from '../utils/typeguards.js';

const baseAnnotations: ObservableAnnotationsArray = [
  [computed, 'mountedViewsCount', 'hasMountingVms'],
  [action, 'link', 'unlink'],
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

  public vmConfig: ViewModelsConfig;

  constructor(protected config?: ViewModelStoreConfig) {
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.viewModels = observable.map([], { deep: false });
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.linkedAnchorVMClasses = observable.map([], { deep: false });
    // @ts-ignore ObservableMap is missing getOrInsert/getOrInsertComputed added in TS 6.0
    this.viewModelIdsByClasses = observable.map([], { deep: true });
    this.vmConfig = mergeVMConfigs(config?.vmConfig);

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

    if (isViewModelSimple(instance)) {
      instance.init?.({ ...config, viewModels: this });
    }
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
    config.id = this.generateViewModelId(config);

    const existing = untracked(() => this.viewModels.get(config.id)) as
      | VM
      | undefined;

    if (existing) {
      return existing;
    }

    const instance = this.create(config);

    this.connect(instance, config);

    return instance;
  }

  unmountNew(instance: VMBase | AnyViewModelSimple) {
    instance.unmount?.();
    this.dettachVMConstructor(instance);
    if (instance.id) {
      this.viewModels.delete(instance.id);
    }
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
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#generateviewmodelid-config)
   * Generates a unique ID for a view model based on the provided configuration.
   * @param config - The configuration for generating the ID.
   * @returns The generated unique ID.
   */
  generateViewModelId<VM extends VMBase | AnyViewModelSimple>(
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

    const viewModelIds = this.viewModelIdsByClasses.get(viewModelClass) || [];

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
    const id = this.getId(vmLookup);

    if (!id) return null;

    return (this.viewModels.get(id) as Maybe<T>) ?? null;
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
    this.viewModels.clear();
    this.linkedAnchorVMClasses.clear();
    this.viewModelIdsByClasses.clear();
  }
}
