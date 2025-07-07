import { ComponentProps, ComponentType } from 'react';
import { loadable, LoadableMixin, LoadableConfig } from 'react-simple-loadable';
import { PackedAsyncModule, unpackAsyncModule } from 'yummies/imports';

import { viewModelsConfig } from '../config/global-config.js';
import { Class, Maybe, MaybePromise } from '../utils/types.js';
import { AnyViewModel } from '../view-model/index.js';

import {
  ComponentWithViewModel,
  ViewModelHocConfig,
  withViewModel,
} from './with-view-model.js';

export interface LazyViewAndModel<
  TViewModel extends AnyViewModel,
  TView extends ComponentType<any>,
> {
  Model: Class<TViewModel> | PackedAsyncModule<Class<TViewModel>>;
  View?: TView | PackedAsyncModule<TView>;
}

export type ComponentWithLazyViewModel<
  TViewModel extends AnyViewModel,
  TView extends ComponentType<any>,
> = ComponentWithViewModel<TViewModel, ComponentProps<TView>> & LoadableMixin;

export interface LazyViewModelHocConfig<TViewModel extends AnyViewModel>
  extends ViewModelHocConfig<TViewModel>,
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
): ComponentWithLazyViewModel<TViewModel, TView> {
  const config: Maybe<LazyViewModelHocConfig<NoInfer<TViewModel>>> =
    typeof configOrFallbackComponent === 'function'
      ? {
          fallback: configOrFallbackComponent,
        }
      : configOrFallbackComponent;

  const patchedConfig: LazyViewModelHocConfig<NoInfer<TViewModel>> = {
    ...config,
    ctx: {
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
  ) as ComponentWithLazyViewModel<TViewModel, TView>;

  patchedConfig.ctx!.externalComponent = lazyVM;

  return lazyVM;
}
