import type { Class, Maybe } from 'yummies/types';
import type {
  ViewModelCreateConfig,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
} from './view-model.store.types.js';
import type { AnyViewModel, AnyViewModelSimple } from './view-model.types.js';
import type { ViewModelsConfig } from '../config/types.js';

/** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface) */
export interface ViewModelStore<VMBase extends AnyViewModel = AnyViewModel> {
  /**
   * Effective merged `ViewModelsConfig` for this store: values from the store constructor are layered over the global defaults (see `ViewModelStoreBase` / `mergeVMConfigs`).
   * Drives `generateId`, `factory`, lifecycle hooks, and other behavior for view models owned by this store.
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
   */
  vmConfig?: ViewModelsConfig;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getids-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The IDs of the view models
   */
  getIds<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): string[];

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getid-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The ID of the view model, or null if not found.
   */
  getId<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): string | null;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#mountedviewscount)
   */
  mountedViewsCount: number;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#has-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns True if the instance exists, false otherwise.
   */
  has<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): boolean;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#get-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The view model instance, or null if not found.
   */
  get<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T | null;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getall-vmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The view model instance, or null if not found.
   */
  getAll<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T[];

  unmountNew(instance: any): any;


  readonly hasMountingVms: boolean

  waitMount(...vms: (AnyViewModel | AnyViewModelSimple)[]): Promise<void>

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#isabletorenderview-viewmodelid)
   * Determines if a view model is able to render based on its ID.
   * @param id - The ID of the view model.
   * @returns True if the view model can render, false otherwise.
   */
  isAbleToRenderView(id: Maybe<VMBase['id']>): boolean;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#createviewmodel-config)
   * Creates a new view model instance based on the provided configuration.
   * @param config - The configuration for creating the view model.
   * @returns The newly created view model instance.
   */
  create<VM extends VMBase | AnyViewModelSimple>(config: ViewModelCreateConfig<VM>): VM;

  /**
   * Defines a view model: returns the existing instance if one with the same ID
   * is already registered, otherwise creates a new instance, connects it to the
   * store, and returns it.
   *
   * This is the recommended way to obtain a VM from the store — it replaces the
   * manual `generateViewModelId` → `get` → `create` → `connect` flow.
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#define)
   */
  define<VM extends VMBase | AnyViewModelSimple>(config: ViewModelCreateConfig<VM>): VM;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#link)
   * Link anchors (React components) with view model class.
   * @param VM - The view model class to link to.
   * @param anchors - The anchors to link.
   */
  link(VM: Class<VMBase>, ...anchors: Maybe<unknown>[]): void;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#unlink)
   * Unlink anchors (React components) with view model class.
   * @param anchors - The anchors to unlink.
   */
  unlink(...anchors: Maybe<unknown>[]): void;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#generateviewmodelid-config)
   * Generates a unique ID for a view model based on the provided configuration.
   * @param config - The configuration for generating the ID.
   * @returns The generated unique ID.
   */
  generateViewModelId<VM extends VMBase>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#clean)
   * Clean up resources associated with the view model store.
   * Clean all inner data structures.
   */
  clean(): void;
}
