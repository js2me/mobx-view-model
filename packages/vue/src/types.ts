import type {
  AnyViewModel,
  ViewModelCreateConfig,
  ViewModelsConfig,
} from 'mobx-view-model';
import type { ComputedRef, Ref, VNodeChild } from 'vue';
import type { Maybe } from 'yummies/types';

export type MaybeRef<T> = T | Ref<T> | ComputedRef<T>;
export type ViewModelPayloadSource<T> = MaybeRef<T> | (() => T);
export type VRenderFn<P = {}> = (props: P) => VNodeChild;
export type VComponent<P = {}> = VRenderFn<P>;

export interface UseCreateViewModelConfig<TViewModel extends AnyViewModel>
  extends Pick<
    ViewModelCreateConfig<TViewModel>,
    'vmConfig' | 'ctx' | 'anchors' | 'props'
  > {
  id?: Maybe<string>;
  factory?: ViewModelsConfig<TViewModel>['factory'];
}
