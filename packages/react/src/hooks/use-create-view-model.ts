import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
  ViewModelsConfig,
} from 'mobx-view-model';
import {
  isViewModel,
  isViewModelSimple,
  viewModelsConfig,
} from 'mobx-view-model';
import { use, useContext, useEffect, useId, useRef } from 'react';
import type { AnyObject, Class, IsPartial, Maybe } from 'yummies/types';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';

const EMPTY_ARR: any[] = [];
const EMPTY_OBJECT: AnyObject = Object.freeze({});

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  !!value &&
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
  payload: any = EMPTY_OBJECT,
  rawCfg?: any,
  props?: any,
) {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  const cache = useRef<{
    vm: AnyViewModel | AnyViewModelSimple;
    promise?: PromiseLike<unknown>;
  }>(null!);

  const reactId = useId();
  let model = cache.current?.vm;

  if (!model) {
    const id =
      process.env.NODE_ENV === 'production' ? reactId : `${reactId}:${VM.name}`;

    const config = {
      ...rawCfg,
      id,
      payload,
      VM,
      viewModels,
      parentViewModel,
      ctx: rawCfg?.ctx ?? EMPTY_OBJECT,
      props: props ?? rawCfg?.props,
    } satisfies ViewModelCreateConfig<any>;

    if (viewModels) {
      model = viewModels.define(config);
    } else {
      model = config.factory?.(config) ?? viewModelsConfig.factory(config);
      model.init?.(config);
    }

    // Suspense remounts reset useRef but reuse the store instance. Calling
    // async mount() again would create a new Promise → use() suspends → remount loop.
    const mountResult =
      isViewModel(model) && model.isMounted ? undefined : model.mount?.();

    if (isViewModelSimple(model)) {
      model.parentViewModel = parentViewModel;
      model.setPayload?.(payload);
    }

    cache.current = {
      vm: model,
      promise: isThenable(mountResult) ? mountResult : undefined,
    };
  } else {
    model.setPayload?.(payload);
  }

  useEffect(
    () => () => {
      if (viewModels) {
        viewModels.unmountNew(model);
      } else {
        model.unmount?.();
      }
    },
    EMPTY_ARR,
  );

  // Suspend until async mount finishes (ssr mode only).
  const pending = cache.current!.promise;
  if (viewModelsConfig.mode === 'ssr' && use && pending) {
    use(pending);
  }

  return model;
}
