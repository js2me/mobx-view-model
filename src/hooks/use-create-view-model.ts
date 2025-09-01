import { useContext, useLayoutEffect } from 'react';
import type { Class, IsPartial, Maybe } from 'yummies/utils/types';

import { viewModelsConfig } from '../config/global-config.js';
import type {
  CreateViewModelFactoryFn,
  GenerateViewModelIdFn,
} from '../config/index.js';
import { ActiveViewModelContext } from '../contexts/active-view-context.js';
import { ViewModelsContext } from '../contexts/view-models-context.js';
import { useIsomorphicLayoutEffect } from '../lib/hooks/use-isomorphic-layout-effect.js';
import { useValue } from '../lib/hooks/use-value.js';
import { isViewModelClass } from '../utils/typeguards.js';
import type { ViewModelCreateConfig } from '../view-model/view-model.store.types.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
} from '../view-model/view-model.types.js';
import type { ViewModelSimple } from '../view-model/view-model-simple.js';

export interface UseCreateViewModelConfig<TViewModel extends AnyViewModel>
  extends Pick<
    ViewModelCreateConfig<TViewModel>,
    'vmConfig' | 'ctx' | 'component' | 'props'
  > {
  /**
   * Unique identifier for the view
   */
  id?: Maybe<string>;

  /**
   * Function to generate an identifier for the view model
   */
  generateId?: GenerateViewModelIdFn;

  /**
   * Function to create an instance of the VM class
   */
  factory?: CreateViewModelFactoryFn<TViewModel>;
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
export function useCreateViewModel<TViewModelSimple extends ViewModelSimple>(
  VM: Class<TViewModelSimple>,
  ...args: TViewModelSimple extends ViewModelSimple<infer TPayload>
    ? IsPartial<TPayload> extends true
      ? [payload?: TPayload]
      : [payload: TPayload]
    : []
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
  if (isViewModelClass(VM)) {
    // scenario for ViewModelBase
    return useCreateViewModelBase(VM, payload, config);
  }

  // scenario for ViewModelSimple
  return useCreateViewModelSimple(VM, payload);
}

const useCreateViewModelBase = (
  VM: Class<AnyViewModel>,
  payload?: any,
  config?: Maybe<UseCreateViewModelConfig<AnyViewModel>>,
) => {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext) || null;

  const ctx = config?.ctx ?? {};

  const instance = useValue(() => {
    const id =
      viewModels?.generateViewModelId({
        ...config,
        ctx,
        VM,
        parentViewModelId: parentViewModel?.id ?? null,
      }) ??
      config?.id ??
      viewModelsConfig.generateId(ctx);

    const instanceFromStore = viewModels ? viewModels.get(id) : null;

    if (instanceFromStore) {
      return instanceFromStore as AnyViewModel;
    } else {
      const configCreate: ViewModelCreateConfig<any> = {
        ...config,
        vmConfig: config?.vmConfig,
        id,
        parentViewModelId: parentViewModel?.id,
        payload: payload ?? {},
        VM,
        viewModels,
        parentViewModel,
        ctx,
      };

      viewModels?.processCreateConfig(configCreate);

      const instance: AnyViewModel =
        config?.factory?.(configCreate) ??
        viewModels?.createViewModel<any>(configCreate) ??
        viewModelsConfig.factory(configCreate);

      instance.willMount();

      viewModels?.markToBeAttached(instance);

      return instance;
    }
  });

  useIsomorphicLayoutEffect(() => {
    if (viewModels) {
      viewModels.attach(instance);
      return () => {
        viewModels.detach(instance.id);
      };
    } else {
      instance.mount();
      return () => {
        instance.willUnmount();
        instance.unmount();
      };
    }
  }, [instance]);

  instance.setPayload(payload ?? {});

  return instance;
};

const useCreateViewModelSimple = (
  VM: Class<AnyViewModelSimple>,
  payload?: any,
) => {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext) || null;

  const instance = useValue(() => {
    const instance = new VM();

    instance.parentViewModel =
      parentViewModel as unknown as (typeof instance)['parentViewModel'];

    viewModels?.markToBeAttached(instance);

    return instance;
  });

  if ('setPayload' in instance) {
    useLayoutEffect(() => {
      instance.setPayload!(payload);
    }, [payload]);
  }

  useIsomorphicLayoutEffect(() => {
    if (viewModels) {
      viewModels.attach(instance);
      return () => {
        viewModels.detach(instance.id);
      };
    } else {
      instance.mount?.();
      return () => {
        instance.unmount?.();
      };
    }
  }, [instance]);

  return instance;
};
