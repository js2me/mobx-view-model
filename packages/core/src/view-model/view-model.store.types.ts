import type { AnyObject, Class, Maybe } from 'yummies/types';
import type { ViewModelsConfig, ViewModelsRawConfig } from '../config/index.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelParams,
} from './view-model.types.js';

export interface ViewModelStoreConfig {
  /**
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/view-models-config)
   */
  vmConfig?: ViewModelsRawConfig;
}

export interface ViewModelGenerateIdConfig<VM extends AnyViewModel> {
  VM: Class<VM>;
  /** tree render id (received and generated from view) */
  id: string;
  ctx: AnyObject;
  parentViewModel?: AnyViewModel | AnyViewModelSimple;
}

export interface ViewModelCreateConfig<VM extends AnyViewModel>
  extends ViewModelParams<VM['payload'], VM['parentViewModel']> {
  VM: Class<VM>;
  /**
   * Additional component anchors for the same VM instance.
   * useViewModel(AnchorComponent) will return this VM when mounted.
   */
  anchors?: import('mobx-view-model-react').RComponentType[];
  props?: AnyObject;
  factory?: ViewModelsConfig['factory']
}

/**
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/other/view-model-lookup)
 */
export type ViewModelLookup<T extends AnyViewModel | AnyViewModelSimple> =
  | AnyViewModel['id']
  | Class<T>
  | (T extends AnyViewModel
      ? import('mobx-view-model-react').VMComponent<T, any> | import('mobx-view-model-react').RComponentType<any>
      : import('mobx-view-model-react').RComponentType<any>);
