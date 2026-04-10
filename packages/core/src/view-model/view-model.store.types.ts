import type { AnyObject, Class, Maybe } from 'yummies/types';
import type { ViewModelsRawConfig } from '../config/index.js';
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
  id?: Maybe<string>;
  ctx: AnyObject;
  parentViewModelId: string | null;
  fallback?: React.ComponentType;
}

export interface ViewModelCreateConfig<VM extends AnyViewModel>
  extends ViewModelParams<VM['payload'], VM['parentViewModel']> {
  VM: Class<VM>;
  fallback?: React.ComponentType;
  component?: import('mobx-view-model-react').VMComponent<AnyViewModel, any>;
  /**
   * Additional component anchors for the same VM instance.
   * useViewModel(AnchorComponent) will return this VM when mounted.
   */
  anchors?: React.ComponentType[];
  props?: AnyObject;
}

/**
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/other/view-model-lookup)
 */
export type ViewModelLookup<T extends AnyViewModel | AnyViewModelSimple> =
  | AnyViewModel['id']
  | Class<T>
  | (T extends AnyViewModel
      ? import('mobx-view-model-react').VMComponent<T, any> | React.ComponentType<any>
      : React.ComponentType<any>);
