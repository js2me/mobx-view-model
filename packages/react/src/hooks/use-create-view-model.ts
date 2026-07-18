import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
  ViewModelsConfig,
} from 'mobx-view-model';
import { isViewModelSimple, viewModelsConfig } from 'mobx-view-model';
import { use, useContext, useEffect, useId, useRef } from 'react';
import type { AnyObject, Class, IsPartial, Maybe } from 'yummies/types';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';


const EMPTY_ARR: any[] = []

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PromiseLike<unknown>).then === 'function';

export interface UseCreateViewModelConfig<TViewModel extends AnyViewModel>
  extends Pick<
    ViewModelCreateConfig<TViewModel>,
    'vmConfig' | 'ctx' | 'anchors' | 'props'
  > {
  /**
   * Unique identifier for the view
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#id)
   */
  id?: Maybe<string>;

  /**
   * Function to create an instance of the VM class
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#factory)
   */
  factory?: ViewModelsConfig<TViewModel>['factory'];
}

/**
 * Creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/use-create-view-model.html)
 */
export function useCreateViewModel<TViewModel extends AnyViewModel>(
  VM: Class<TViewModel>,
  ...args: IsPartial<TViewModel['payload']> extends true
    ? [
        payload?: TViewModel['payload'],
        config?: UseCreateViewModelConfig<TViewModel>,
        _props?: any,
      ]
    : [
        payload: TViewModel['payload'],
        config?: UseCreateViewModelConfig<TViewModel>,
        _props?: any,
      ]
): TViewModel;

/**
 * Creates new instance of ViewModelSimple
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/use-create-view-model.html)
 */
export function useCreateViewModel<
  TPayload extends AnyObject,
  TViewModelSimple extends ViewModelSimple<TPayload>,
>(
  VM: Class<TViewModelSimple>,
  ...args: IsPartial<TPayload> extends true
    ? [payload?: TPayload, config?: ViewModelCreateConfig<TViewModelSimple>]
    : [payload: TPayload, config?: ViewModelCreateConfig<TViewModelSimple>]
): TViewModelSimple;

/**
 * Creates new instance of ViewModelSimple
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/use-create-view-model.html)
 */
export function useCreateViewModel<TViewModelSimple>(
  VM: Class<TViewModelSimple>,
): TViewModelSimple;

/**
 * Creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/use-create-view-model.html)
 */
export function useCreateViewModel(
  VM: Class<any>,
  payload?: any,
  rawCfg?: any,
  props?: any,
) {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  // @ts-ignore
  const cache = useRef<{ vm: AnyViewModel | AnyViewModelSimple, promise?: any }>();
  let model: AnyViewModel | AnyViewModelSimple = cache.current?.vm;

  const treeRenderId = process.env.NODE_ENV === 'production' ? useId() : `${useId()}:${VM.name}`;

  if (!model) {
    const config = {
      ...rawCfg,
      id: treeRenderId,
      payload,
      VM,
      viewModels,
      parentViewModel,
      ctx: rawCfg?.ctx ?? {},
      props: props ?? rawCfg?.props,
    } satisfies ViewModelCreateConfig<any>;

    if (viewModels) {
      model = viewModels.define(config);
    } else {
      model = config?.factory?.(config) ?? viewModelsConfig.factory(config);
      model.init?.(config)
    }

    let result = model.mount?.();

    if (isViewModelSimple(model)) {
      model.parentViewModel = parentViewModel;
      model.setPayload?.(payload)
    }

    cache.current = {
      vm: model,
      promise: isThenable(result) ? result : undefined,
    };
  } else {
    model.setPayload?.(payload)
  }

  useEffect(() => () => {
    if (viewModels) {
      viewModels.unmountNew(model)
    } else {
      model.unmount?.()
    }
  }, EMPTY_ARR);

  if (viewModelsConfig.mode === 'ssr' && use && cache.current?.promise) {
    use(cache.current.promise);
  }

  return model;
}
