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
  component?: import('../react/hoc/with-view-model.js').VMComponent<AnyViewModel, any>;
  /**
   * Additional component anchors for the same VM instance.
   * useViewModel(AnchorComponent) will return this VM when mounted.
   */
  anchors?: React.ComponentType[];
  props?: AnyObject;
}

/**
 * [**Documentation**](https://js2me.github.io/mobx-view-model/api/other/view-model-lookup)
 *
 * Note: `React.ComponentType<any>` intentionally lives outside of the
 * distributive conditional below. Keeping the `VMComponent<T, any> | React.ComponentType<any>`
 * union inside the `T extends AnyViewModel` branch breaks contextual typing
 * of `withViewModel` inline components for consumers of the bundled d.ts
 * (the `model` prop degrades to an implicit `any`).
 */
export type ViewModelLookup<T extends AnyViewModel | AnyViewModelSimple> =
  | AnyViewModel['id']
  | Class<T>
  | React.ComponentType<any>
  | (T extends AnyViewModel
      ? import('../react/hoc/with-view-model.js').VMComponent<T, any>
      : never);
