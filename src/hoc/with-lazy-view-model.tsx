import { ComponentProps, ComponentType } from 'react';
import { PackedAsyncModule, unpackAsyncModule } from 'yummies/imports';

import { viewModelsConfig } from '../config/global-config.js';
import { loadable, LoadableMixin } from '../lib/react-simple-loadable.js';
import { Class, MaybePromise } from '../utils/types.js';
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

/**
 * Lazy creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-lazy-view-model.html)
 */
export function withLazyViewModel<
  TViewModel extends AnyViewModel,
  TView extends ComponentType<any>,
>(
  loadFunction: () => MaybePromise<LazyViewAndModel<TViewModel, TView>>,
  config?: ViewModelHocConfig<any>,
): ComponentWithLazyViewModel<TViewModel, TView> {
  const patchedConfig: ViewModelHocConfig<any> = {
    ...config,
    ctx: {
      ...config?.ctx,
      externalComponent: null,
    },
  };

  const fallbackComponent =
    patchedConfig?.fallback ?? viewModelsConfig.fallbackComponent;

  const lazyVM = loadable(async () => {
    const { Model: ModelOrAsync, View: ViewOrAsync } = await loadFunction();
    const [Model, View] = await Promise.all([
      unpackAsyncModule(ModelOrAsync),
      unpackAsyncModule(ViewOrAsync),
    ]);

    return withViewModel(Model, patchedConfig)(View);
  }, fallbackComponent) as ComponentWithLazyViewModel<TViewModel, TView>;

  patchedConfig.ctx!.externalComponent = lazyVM;

  return lazyVM;
}
