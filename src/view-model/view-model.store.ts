import type { Class, Maybe } from 'yummies/types';
import type { VMComponent, VMLazyComponent } from '../react/hoc/index.js';
import type {
  ViewModelCreateConfig,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
} from './view-model.store.types.js';
import type { AnyViewModel, AnyViewModelSimple } from './view-model.types.js';
import type { ViewModelSimple } from './view-model-simple.js';

/** [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface) */
export interface ViewModelStore<VMBase extends AnyViewModel = AnyViewModel> {
  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getidsvmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The IDs of the view models
   */
  getIds<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): string[];

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getidvmlookup)
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
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#hasvmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns True if the instance exists, false otherwise.
   */
  has<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): boolean;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getvmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The view model instance, or null if not found.
   */
  get<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T | null;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#getallvmlookup)
   * @param vmLookup - The ID or class type of the view model. See {@link ViewModelLookup}.
   * @returns The view model instance, or null if not found.
   */
  getAll<T extends VMBase | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T[];

  /**
   * This is specific method to be called when a view model is about to be attached to view.
   * This method is the first method where the created view model instance is passed to the view model store.
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#marktobeattachedviewmodel)
   */
  markToBeAttached(model: VMBase | AnyViewModelSimple): void;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#attachviewmodel)
   * @param model - The view model to attach.
   * @returns A promise that resolves when the operation is complete.
   */
  attach(model: VMBase | AnyViewModelSimple): Promise<void>;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#detachviewmodelid)
   * @param id - The ID of the view model to detach.
   * @returns A promise that resolves when the operation is complete.
   */
  detach(id: VMBase['id'] | ViewModelSimple['id']): Promise<void>;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#isabletorenderviewviewmodelid)
   * Determines if a view model is able to render based on its ID.
   * @param id - The ID of the view model.
   * @returns True if the view model can render, false otherwise.
   */
  isAbleToRenderView(id: Maybe<VMBase['id']>): boolean;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#createviewmodelconfig)
   * Creates a new view model instance based on the provided configuration.
   * @param config - The configuration for creating the view model.
   * @returns The newly created view model instance.
   */
  createViewModel<VM extends VMBase>(config: ViewModelCreateConfig<VM>): VM;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#processcreateconfigconfig)
   * Process the configuration for creating a view model.
   * This method is called just before creating a new view model instance.
   * It's useful for initializing the configuration, like linking components to the view model class.
   * @param config - The configuration for creating the view model.
   */
  processCreateConfig<VM extends VMBase>(
    config: ViewModelCreateConfig<VM>,
  ): void;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#linkcomponents)
   * Link React components with view model class.
   * @param VM - The view model class to link to.
   * @param components - The components to link.
   */
  linkComponents(
    VM: Class<VMBase>,
    ...components: Maybe<
      VMComponent<VMBase, any> | VMLazyComponent<VMBase, any>
    >[]
  ): void;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#unlinkcomponents)
   * Unlink React components with view model class.
   * @param components - The components to unlink.
   */
  unlinkComponents(
    ...components: Maybe<
      VMComponent<VMBase, any> | VMLazyComponent<VMBase, any>
    >[]
  ): void;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#generateviewmodelidconfig)
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
