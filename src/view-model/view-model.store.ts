import {
  ComponentWithLazyViewModel,
  ComponentWithViewModel,
} from '../hoc/index.js';
import { Class, Maybe } from '../utils/types.js';

import { ViewModelSimple } from './view-model.js';
import {
  ViewModelCreateConfig,
  ViewModelGenerateIdConfig,
  ViewModelLookup,
} from './view-model.store.types.js';
import { AnyViewModel, AnyViewModelSimple } from './view-model.types.js';

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

  markToBeAttached(model: VMBase | ViewModelSimple): void;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#attachviewmodel)
   * @param model - The view model to attach.
   * @returns A promise that resolves when the operation is complete.
   */
  attach(model: VMBase | ViewModelSimple): Promise<void>;

  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-model-store/interface#detachviewmodelid)
   * @param id - The ID of the view model to detach.
   * @returns A promise that resolves when the operation is complete.
   */
  detach(id: VMBase['id'] | ViewModelSimple['id']): Promise<void>;

  /**
   * Determines if a view model is able to render based on its ID.
   * @param id - The ID of the view model.
   * @returns True if the view model can render, false otherwise.
   */
  isAbleToRenderView(id: Maybe<VMBase['id']>): boolean;

  /**
   * Creates a new view model instance based on the provided configuration.
   * @param config - The configuration for creating the view model.
   * @returns The newly created view model instance.
   */
  createViewModel<VM extends VMBase>(config: ViewModelCreateConfig<VM>): VM;

  /**
   * Process the configuration for creating a view model.
   * This method is called just before creating a new view model instance.
   * It's useful for initializing the configuration, like linking components to the view model class.
   * @param config - The configuration for creating the view model.
   */
  processCreateConfig<VM extends VMBase>(
    config: ViewModelCreateConfig<VM>,
  ): void;

  /**
   * Link React components with view model class.
   * @param VM - The view model class to link to.
   * @param components - The components to link.
   */
  linkComponents(
    VM: Class<VMBase>,
    ...components: Maybe<
      | ComponentWithViewModel<VMBase, any>
      | ComponentWithLazyViewModel<VMBase, any>
    >[]
  ): void;

  /**
   * Unlink React components with view model class.
   * @param components - The components to unlink.
   */
  unlinkComponents(
    ...components: Maybe<
      | ComponentWithViewModel<VMBase, any>
      | ComponentWithLazyViewModel<VMBase, any>
    >[]
  ): void;

  /**
   * Generates a unique ID for a view model based on the provided configuration.
   * @param config - The configuration for generating the ID.
   * @returns The generated unique ID.
   */
  generateViewModelId<VM extends VMBase>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string;

  /**
   * Clean up resources associated with the view model store.
   * Clean all inner data structures.
   */
  clean(): void;
}
