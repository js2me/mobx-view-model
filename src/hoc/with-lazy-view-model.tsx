import { ComponentProps, ComponentType } from 'react';
import { loadable, LoadableMixin } from 'react-simple-loadable/loadable';

import { Class } from '../utils/types';
import { AnyViewModel } from '../view-model';

import {
  ComponentWithViewModel,
  ViewModelHocConfig,
  withViewModel,
} from './with-view-model';

export interface LazyViewAndModel<
  TViewModel extends AnyViewModel,
  TView extends ComponentType<any>,
> {
  Model: Class<TViewModel>;
  View: TView;
}

export function withLazyViewModel<
  TViewModel extends AnyViewModel,
  TView extends ComponentType<any>,
>(
  loadFunction: () => Promise<LazyViewAndModel<TViewModel, TView>>,
  config?: ViewModelHocConfig<any>,
) {
  const patchedConfig: ViewModelHocConfig<any> = {
    ...config,
    ctx: {
      ...config?.ctx,
      externalComponent: null,
    },
  };

  const lazyVM = loadable(async () => {
    const { Model, View } = await loadFunction();
    return withViewModel(Model, patchedConfig)(View);
  }, patchedConfig?.fallback) as unknown as ComponentWithViewModel<
    TViewModel,
    ComponentProps<TView>
  > &
    LoadableMixin;

  patchedConfig.ctx!.externalComponent = lazyVM;

  return lazyVM;
}
