import type { ComputedRef, Ref } from 'vue';
import type { AnyObject, Maybe } from 'yummies/types';
import type { ViewModelsRawConfig } from '../config/index.js';
import type { AnyViewModel } from '../view-model/index.js';

export type MaybeRef<T> = T | Ref<T> | ComputedRef<T>;

export interface UseCreateViewModelConfig<TViewModel extends AnyViewModel> {
  id?: Maybe<string>;
  generateId?: (ctx: AnyObject) => string;
  factory?: (config: any) => TViewModel;
  vmConfig?: ViewModelsRawConfig;
  ctx?: AnyObject;
  component?: unknown;
  anchors?: unknown[];
  props?: AnyObject;
}
