import { ComponentProps, ComponentType } from 'react';
import { loadable, LoadableMixin, LoadableConfig } from 'react-simple-loadable';
import { PackedAsyncModule, unpackAsyncModule } from 'yummies/imports';

import { viewModelsConfig } from '../config/global-config.js';
import { Class, Maybe, MaybePromise } from '../utils/types.js';
import { AnyViewModel, AnyViewModelSimple } from '../view-model/index.js';

import {
  VMComponent,
  ViewModelHocConfig,
  ViewModelSimpleHocConfig,
  withViewModel,
} from './with-view-model.js';

export interface LazyViewAndModel<
  TViewModel extends AnyViewModel | AnyViewModelSimple,
  TView extends ComponentType<any>,
> {
  Model: Class<TViewModel> | PackedAsyncModule<Class<TViewModel>>;
  View?: TView | PackedAsyncModule<TView>;
}

export type VMLazyComponent<
  TViewModel extends AnyViewModel | AnyViewModelSimple,
  TView extends ComponentType<any>,
> = VMComponent<TViewModel, ComponentProps<TView>> & LoadableMixin;

/**
 * @deprecated use `VMLazyComponent` instead. Will be removed in next major release
 */
export type ComponentWithLazyViewModel<
  TViewModel extends AnyViewModel | AnyViewModelSimple,
  TView extends ComponentType<any>,
> = VMLazyComponent<TViewModel, ComponentProps<TView>> & LoadableMixin;

export interface LazyViewModelHocConfig<TViewModel extends AnyViewModel>
  extends ViewModelHocConfig<TViewModel>,
    Pick<LoadableConfig, 'loading' | 'preload' | 'throwOnError'> {}

export interface LazyViewModelSimpleHocConfig<
  TViewModel extends AnyViewModelSimple,
> extends ViewModelSimpleHocConfig<TViewModel>,
    Pick<LoadableConfig, 'loading' | 'preload' | 'throwOnError'> {}

/**
 * A Higher-Order Component that **LAZY** connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-lazy-view-model.html)
 */
export function withLazyViewModel<
  TViewModel extends AnyViewModel,
  TView extends ComponentType<any>,
>(
  loadFunction: () => MaybePromise<LazyViewAndModel<TViewModel, TView>>,
  configOrFallbackComponent?:
    | LazyViewModelHocConfig<NoInfer<TViewModel>>
    | LoadableConfig['loading'],
): VMLazyComponent<TViewModel, TView>;

/**
 * A Higher-Order Component that **LAZY** connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-lazy-view-model.html)
 */
export function withLazyViewModel<
  TViewModel extends AnyViewModelSimple,
  TView extends ComponentType<any>,
>(
  loadFunction: () => MaybePromise<LazyViewAndModel<TViewModel, TView>>,
  configOrFallbackComponent?:
    | LazyViewModelSimpleHocConfig<NoInfer<TViewModel>>
    | LoadableConfig['loading'],
): VMLazyComponent<TViewModel, TView>;

/**
 * A Higher-Order Component that **LAZY** connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-lazy-view-model.html)
 */
export function withLazyViewModel<
  TViewModel extends AnyViewModel | AnyViewModelSimple,
  TView extends ComponentType<any>,
>(
  loadFunction: () => MaybePromise<LazyViewAndModel<TViewModel, TView>>,
  configOrFallbackComponent?:
    | LazyViewModelSimpleHocConfig<any>
    | LazyViewModelHocConfig<any>
    | LoadableConfig['loading'],
): VMLazyComponent<TViewModel, TView> {
  const config: Maybe<
    LazyViewModelHocConfig<any> | LazyViewModelSimpleHocConfig<any>
  > =
    typeof configOrFallbackComponent === 'function'
      ? {
          fallback: configOrFallbackComponent,
        }
      : configOrFallbackComponent;

  const patchedConfig: LazyViewModelHocConfig<any> = {
    ...config,
    ctx: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      ...config?.ctx,
      externalComponent: null,
    },
  };

  const fallbackComponent =
    patchedConfig?.fallback ?? viewModelsConfig.fallbackComponent;

  const lazyVM = loadable(
    async () => {
      const { Model: ModelOrAsync, View: ViewOrAsync } = await loadFunction();
      const [Model, View] = await Promise.all([
        unpackAsyncModule(ModelOrAsync),
        unpackAsyncModule(ViewOrAsync),
      ]);

      return withViewModel(Model, patchedConfig)(View);
    },
    {
      loading: patchedConfig?.loading ?? fallbackComponent,
      preload: patchedConfig?.preload,
      throwOnError: patchedConfig?.throwOnError,
    },
  ) as VMLazyComponent<TViewModel, TView>;

  patchedConfig.ctx!.externalComponent = lazyVM;

  return lazyVM;
}
