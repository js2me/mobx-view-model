import type {
  AnyViewModel,
  ViewModelCreateConfig,
  ViewModelsRawConfig,
} from 'mobx-view-model';
import type { ComputedRef, Ref } from 'vue';
import type { AnyObject, Maybe } from 'yummies/types';

export type MaybeRef<T> = T | Ref<T> | ComputedRef<T>;

export interface UseCreateViewModelConfig<TViewModel extends AnyViewModel> {
  id?: Maybe<string>;
  generateId?: (ctx: AnyObject) => string;
  factory?: (config: ViewModelCreateConfig<TViewModel>) => TViewModel;
  vmConfig?: ViewModelsRawConfig & { wrapViewsInObserver?: boolean };
  ctx?: AnyObject;
  component?: unknown;
  anchors?: unknown[];
  props?: AnyObject;
}
