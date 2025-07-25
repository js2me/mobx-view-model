/* eslint-disable react-hooks/rules-of-hooks */
import { useContext, useLayoutEffect } from 'react';
import { Class, AllPropertiesOptional, Maybe } from 'yummies/utils/types';

import { viewModelsConfig } from '../config/global-config.js';
import {
  CreateViewModelFactoryFn,
  GenerateViewModelIdFn,
} from '../config/index.js';
import { ActiveViewModelContext } from '../contexts/active-view-context.js';
import { ViewModelsContext } from '../contexts/view-models-context.js';
import { useIsomorphicLayoutEffect } from '../lib/hooks/use-isomorphic-layout-effect.js';
import { useValue } from '../lib/hooks/use-value.js';
import { generateVmId } from '../utils/generate-vm-id.js';
import { ViewModelSimple } from '../view-model/view-model-simple.js';
import { ViewModelCreateConfig } from '../view-model/view-model.store.types.js';
import { AnyViewModel } from '../view-model/view-model.types.js';

export interface UseCreateViewModelConfig<TViewModel extends AnyViewModel>
  extends Pick<
    ViewModelCreateConfig<TViewModel>,
    'vmConfig' | 'config' | 'ctx' | 'component' | 'componentProps'
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

const useCreateViewModelSimple = (
  VM: Class<ViewModelSimple>,
  payload?: any,
) => {
  const viewModels = useContext(ViewModelsContext);
  const instance = useValue(() => {
    const instance = new VM();

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

/**
 * Creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/use-create-view-model.html)
 */
export function useCreateViewModel<TViewModel extends AnyViewModel>(
  VM: Class<TViewModel>,
  ...args: AllPropertiesOptional<TViewModel['payload']> extends true
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
    ? AllPropertiesOptional<TPayload> extends true
      ? [payload?: TPayload]
      : [payload: TPayload]
    : []
): TViewModelSimple;

/**
 * Creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/use-create-view-model.html)
 */
export function useCreateViewModel(VM: Class<any>, ...args: any[]) {
  const [payload, config] = args as unknown as [
    any,
    Maybe<UseCreateViewModelConfig<AnyViewModel>>,
  ];

  if (
    !('willMount' in VM.prototype) &&
    !('payloadChanged' in VM.prototype) &&
    !('willUnmount' in VM.prototype)
  ) {
    // scenario for ViewModelSimple
    return useCreateViewModelSimple(VM, payload);
  }

  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext) || null;

  const ctx = config?.ctx ?? {};

  const instance = useValue(() => {
    const id =
      viewModels?.generateViewModelId({
        ...config,
        ctx,
        VM,
        parentViewModelId: parentViewModel?.id,
      }) ??
      config?.id ??
      generateVmId(ctx);

    const instanceFromStore = viewModels ? viewModels.get(id) : null;

    if (instanceFromStore) {
      return instanceFromStore as AnyViewModel;
    } else {
      const configCreate: ViewModelCreateConfig<any> = {
        ...config,
        vmConfig: config?.config ?? config?.vmConfig,
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
}
