import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
  ViewModelsConfig,
} from 'mobx-view-model';
import { isViewModelClass, viewModelsConfig } from 'mobx-view-model';
import { useContext, useEffect, useId, useRef } from 'react';
import type { AnyObject, Class, Dict, IsPartial, Maybe } from 'yummies/types';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';

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
   * Function to generate an identifier for the view model
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#generateid)
   */
  generateId?: ViewModelsConfig<TViewModel>['generateId'];

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
      ]
    : [
        payload: TViewModel['payload'],
        config?: UseCreateViewModelConfig<TViewModel>,
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
    ? [payload?: TPayload]
    : [payload: TPayload]
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
  config?: any,
) {
  let instance: AnyViewModel | AnyViewModelSimple;

  if (isViewModelClass(VM)) {
    // scenario for ViewModelBase
    instance = useCreateViewModelBase(VM, payload, config);
  } else {
    // scenario for ViewModelSimple
    instance = useCreateViewModelSimple(VM, payload);
  }

  return instance;
}

const EMPTY_ARR: any[] = []

const useCreateViewModelBase = (
  VM: Class<AnyViewModel>,
  payload: Dict,
  rawCfg?: Maybe<UseCreateViewModelConfig<AnyViewModel>>,
) => {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  // @ts-ignore
  const modelRef = useRef<AnyViewModel>();
  let model: AnyViewModel = modelRef.current;

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
    } satisfies ViewModelCreateConfig<any>;

    if (viewModels) {
      model = viewModels.define(config);
    } else {
      model = config?.factory?.(config) ?? viewModelsConfig.factory(config);
    }

    modelRef.current = model;
  } else {
    model.setPayload(payload)
  }

  useEffect(() => () => {
    if (viewModels) {
      viewModels.unmountNew(model)
    } else {
      model.unmount()
    }
  }, EMPTY_ARR)

  return model;
};

const useCreateViewModelSimple = (
  VM: Class<AnyViewModelSimple>,
  payload: Dict,
) => {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  // @ts-ignore
  const modelRef = useRef<AnyViewModelSimple>();
  let model: AnyViewModelSimple = modelRef.current;

  if (!model) {
    // аналогично сделать как и базовой вью модели 
    modelRef.current = model = viewModels ? viewModels.define() : new VM();

    model.parentViewModel =
      parentViewModel as unknown as (typeof model)['parentViewModel'];

    if (viewModels) {
      model.attachViewModelStore?.(viewModels);
    }
  }

  useEffect(() => () => {
    if (viewModels) {
      viewModels.unmountNew(model)
    } else {
      model.unmount?.()
    }
  }, EMPTY_ARR)

    model.setPayload?.(payload)

  return model;
};
