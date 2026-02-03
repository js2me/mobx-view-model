import { action, computed, observable, runInAction } from 'mobx';
import type { ObservableAnnotationsArray } from 'yummies/mobx';
import type { Class, Maybe } from 'yummies/types';
import {
  applyObservable,
  mergeVMConfigs,
  type ViewModelsConfig,
} from '../config/index.js';
import type { ViewModelBase } from './view-model.base.js';
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

  protected vmConfig: ViewModelsConfig;

  constructor(protected config?: ViewModelStoreConfig) {
    this.viewModels = observable.map([], { deep: false });
    this.linkedAnchorVMClasses = observable.map([], { deep: false });
    this.viewModelIdsByClasses = observable.map([], { deep: true });
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

  processCreateConfig<VM extends VMBase>(
    config: ViewModelCreateConfig<VM>,
  ): void {
    const fromConfig = config.anchors ?? [];

    this.link(config.VM, config.component, ...fromConfig);
  }

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

  generateViewModelId<VM extends VMBase>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string {
    if (config.id) {
      return config.id;
    } else {
      return this.vmConfig.generateId(config.ctx);
    }
  }

  link(VM: Class<VMBase>, ...anchors: Maybe<unknown>[]): void {
    anchors.forEach((anchor) => {
      if (anchor && !this.linkedAnchorVMClasses.has(anchor)) {
        this.linkedAnchorVMClasses.set(anchor, VM);
      }
    });
  }

  unlink(...anchors: Maybe<unknown>[]): void {
    anchors.forEach((anchor) => {
      if (anchor && this.linkedAnchorVMClasses.has(anchor)) {
        this.linkedAnchorVMClasses.delete(anchor);
      }
    });
  }

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

  has<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): boolean {
    const id = this.getId(vmLookup);

    if (!id) return false;

    return this.viewModels.has(id);
  }

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

  getOrCreateVmId(model: VMBase | AnyViewModelSimple): string {
    if (!model.id) {
      (model as AnyViewModelSimple).id = this.vmConfig.generateId({
        VM: model.constructor,
      });
    }

    return model.id!;
  }

  getAll<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T[] {
    const viewModelIds = this.getIds(vmLookup);

    return viewModelIds.map((id) => this.viewModels.get(id) as T);
  }

  async mount(model: VMBase | AnyViewModelSimple) {
    const modelId = this.getOrCreateVmId(model);

    this.mountingViews.add(modelId);

    await model.mount?.();

    runInAction(() => {
      this.mountingViews.delete(modelId);
    });
  }

  async unmount(model: VMBase | AnyViewModelSimple) {
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

  markToBeAttached(model: VMBase | AnyViewModelSimple) {
    const modelId = this.getOrCreateVmId(model);

    this.viewModelsTempHeap.set(modelId, model as VMBase);

    if ('attachViewModelStore' in model) {
      model.attachViewModelStore!(this as ViewModelStore);
    }

    this.attachVMConstructor(model);
  }

  async attach(model: VMBase | AnyViewModelSimple) {
    const modelId = this.getOrCreateVmId(model);

    const attachedCount = this.instanceAttachedCount.get(modelId) ?? 0;

    this.instanceAttachedCount.set(modelId, attachedCount + 1);

    if (this.viewModels.has(modelId)) {
      return;
    }

    this.viewModels.set(modelId, model);

    this.attachVMConstructor(model);

    await this.mount(model);

    this.viewModelsTempHeap.delete(modelId);
  }

  async detach(id: string) {
    const attachedCount = this.instanceAttachedCount.get(id) ?? 0;

    this.viewModelsTempHeap.delete(id);

    const model = this.viewModels.get(id);

    if (!model) {
      return;
    }

    const nextInstanceAttachedCount = attachedCount - 1;

    this.instanceAttachedCount.set(id, nextInstanceAttachedCount);

    if (nextInstanceAttachedCount <= 0) {
      if ('willUnmount' in model) {
        model.willUnmount();
      }

      this.instanceAttachedCount.delete(id);
      this.viewModels.delete(id);
      this.dettachVMConstructor(model);

      await this.unmount(model);
    }
  }

  isAbleToRenderView(id: Maybe<string>): boolean {
    const isViewMounting = this.mountingViews.has(id!);
    const hasViewModel = this.viewModels.has(id!);
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
