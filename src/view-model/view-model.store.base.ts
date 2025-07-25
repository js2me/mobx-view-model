import { action, computed, observable, runInAction } from 'mobx';

import {
  ViewModelsConfig,
  mergeVMConfigs,
  applyObservable,
} from '../config/index.js';
import {
  ComponentWithLazyViewModel,
  ComponentWithViewModel,
} from '../hoc/index.js';
import { generateVmId } from '../utils/index.js';
import { Class, Maybe } from '../utils/types.js';

import { ViewModelBase } from './view-model.base.js';
import { ViewModelStore } from './view-model.store.js';
import {
  ViewModelCreateConfig,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
  ViewModelStoreConfig,
} from './view-model.store.types.js';
import {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelParams,
} from './view-model.types.js';

export class ViewModelStoreBase<VMBase extends AnyViewModel = AnyViewModel>
  implements ViewModelStore<VMBase>
{
  protected viewModels: Map<string, VMBase | AnyViewModelSimple>;
  protected linkedComponentVMClasses: Map<
    ComponentWithViewModel<VMBase, any>,
    Class<VMBase>
  >;
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
    this.linkedComponentVMClasses = observable.map([], { deep: false });
    this.viewModelIdsByClasses = observable.map([], { deep: true });
    this.instanceAttachedCount = observable.map([], { deep: false });
    this.mountingViews = observable.set([], { deep: false });
    this.unmountingViews = observable.set([], { deep: false });
    this.vmConfig = mergeVMConfigs(config?.vmConfig);
    this.viewModelsTempHeap = new Map();

    applyObservable(
      this,
      [
        ['mountedViewsCount', computed],
        ['mount', action],
        ['unmount', action],
        ['attachVMConstructor', action],
        ['attach', action],
        ['detach', action],
        ['linkComponents', action],
        ['unlinkComponents', action],
      ],
      this.vmConfig.observable.viewModelStores,
    );
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
    this.linkComponents(
      config.VM,
      config.component,
      config.ctx?.externalComponent,
    );
  }

  createViewModel<VM extends VMBase>(config: ViewModelCreateConfig<VM>): VM {
    const VMConstructor = config.VM as unknown as typeof ViewModelBase;
    const vmConfig = mergeVMConfigs(
      this.vmConfig,
      config.config ?? config.vmConfig,
    );
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
    } else if (this.vmConfig.generateId) {
      return this.vmConfig.generateId(config);
    } else {
      return generateVmId(config.ctx);
    }
  }

  linkComponents(
    VM: Class<VMBase>,
    ...components: Maybe<
      | ComponentWithViewModel<VMBase, any>
      | ComponentWithLazyViewModel<VMBase, any>
    >[]
  ): void {
    components.forEach((component) => {
      if (component && !this.linkedComponentVMClasses.has(component)) {
        this.linkedComponentVMClasses.set(component, VM);
      }
    });
  }

  unlinkComponents(
    ...components: Maybe<
      | ComponentWithViewModel<VMBase, any>
      | ComponentWithLazyViewModel<VMBase, any>
    >[]
  ): void {
    components.forEach((component) => {
      if (component && this.linkedComponentVMClasses.has(component)) {
        this.linkedComponentVMClasses.delete(component);
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

    const viewModelClass = (this.linkedComponentVMClasses.get(
      vmLookup as any,
    ) || vmLookup) as Class<T>;

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

  getAll<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T[] {
    const viewModelIds = this.getIds(vmLookup);

    return viewModelIds.map((id) => this.viewModels.get(id) as T);
  }

  async mount(model: VMBase | AnyViewModelSimple) {
    this.mountingViews.add(model.id);

    await model.mount?.();

    runInAction(() => {
      this.mountingViews.delete(model.id);
    });
  }

  async unmount(model: VMBase | AnyViewModelSimple) {
    this.unmountingViews.add(model.id);

    await model.unmount?.();

    runInAction(() => {
      this.unmountingViews.delete(model.id);
    });
  }

  protected attachVMConstructor(model: VMBase | AnyViewModelSimple) {
    const constructor = (model as any).constructor as Class<any, any>;

    if (this.viewModelIdsByClasses.has(constructor)) {
      const vmIds = this.viewModelIdsByClasses.get(constructor)!;
      if (!vmIds.includes(model.id)) {
        vmIds.push(model.id);
      }
    } else {
      this.viewModelIdsByClasses.set(constructor, [model.id]);
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this.viewModelsTempHeap.set(model.id, model);

    if ('linkStore' in model) {
      model.linkStore!(this as any);
    }

    this.attachVMConstructor(model);
  }

  async attach(model: VMBase | AnyViewModelSimple) {
    const attachedCount = this.instanceAttachedCount.get(model.id) ?? 0;

    this.instanceAttachedCount.set(model.id, attachedCount + 1);

    if (this.viewModels.has(model.id)) {
      return;
    }

    this.viewModels.set(model.id, model);

    this.attachVMConstructor(model);

    await this.mount(model);

    this.viewModelsTempHeap.delete(model.id);
  }

  async detach(id: string) {
    const attachedCount = this.instanceAttachedCount.get(id) ?? 0;

    this.viewModelsTempHeap.delete(id);

    const model = this.viewModels.get(id);

    if (!model) {
      return;
    }

    const nextInstanceAttachedCount = attachedCount - 1;

    this.instanceAttachedCount.set(model.id, nextInstanceAttachedCount);

    if (nextInstanceAttachedCount <= 0) {
      if ('willUnmount' in model) {
        model.willUnmount();
      }

      this.instanceAttachedCount.delete(model.id);
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
    this.linkedComponentVMClasses.clear();
    this.viewModelIdsByClasses.clear();
    this.instanceAttachedCount.clear();
    this.mountingViews.clear();
    this.unmountingViews.clear();
    this.viewModelsTempHeap.clear();
  }
}
