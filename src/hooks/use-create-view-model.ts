/* eslint-disable react-hooks/rules-of-hooks */
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import {
  AnyObject,
  Class,
  AllPropertiesOptional,
  Maybe,
} from 'yummies/utils/types';

import { viewModelsConfig } from '../config/global-config.js';
import { mergeVMConfigs } from '../config/index.js';
import { ActiveViewModelContext } from '../contexts/active-view-context.js';
import { ViewModelsContext } from '../contexts/view-models-context.js';
import { useIsomorphicLayoutEffect } from '../lib/hooks/use-isomorphic-layout-effect.js';
import { generateVMId } from '../utils/create-vm-id-generator.js';
import { ViewModelSimple } from '../view-model/view-model.js';
import { ViewModelCreateConfig } from '../view-model/view-model.store.types.js';
import {
  AnyViewModel,
  ViewModelParams,
} from '../view-model/view-model.types.js';

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
  generateId?: (ctx: AnyObject) => string;

  /**
   * Function to create an instance of the VM class
   */
  factory?: (config: ViewModelCreateConfig<TViewModel>) => TViewModel;
}

const useCreateViewModelSimple = (
  VM: Class<ViewModelSimple>,
  payload?: any,
) => {
  const viewModels = useContext(ViewModelsContext);
  const lastInstance = useRef<ViewModelSimple | null>(null);

  const [instance] = useState(() => {
    if (lastInstance.current) {
      return lastInstance.current;
    }

    const instance = new VM();
    viewModels?.markToBeAttached(instance);
    if (viewModels) {
      instance.linkStore?.(viewModels);
    }
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
        lastInstance.current = null;
      };
    } else {
      instance.mount?.();
      return () => {
        instance.unmount?.();
        lastInstance.current = null;
      };
    }
  }, []);

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

  const idRef = useRef<string>('');
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext) || null;

  const ctx = config?.ctx ?? {};

  if (!idRef.current) {
    idRef.current =
      viewModels?.generateViewModelId({
        ...config,
        ctx,
        VM,
        parentViewModelId: parentViewModel?.id,
      }) ??
      config?.id ??
      generateVMId(ctx);
  }

  const id = idRef.current;

  const instanceFromStore = viewModels ? viewModels.get(id) : null;
  const instanceRef = useRef<AnyViewModel | null>(null);

  if (!instanceRef.current) {
    if (instanceFromStore) {
      instanceRef.current = instanceFromStore as AnyViewModel;
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
        viewModelsConfig.factory?.(configCreate) ??
        new VM({
          ...configCreate,
          vmConfig: mergeVMConfigs(
            configCreate.config ?? configCreate.vmConfig,
          ),
        } satisfies ViewModelParams<any>);

      instanceRef.current = instance;

      instance.willMount();

      viewModels?.markToBeAttached(instance);
    }
  }

  const instance = instanceRef.current;

  useIsomorphicLayoutEffect(() => {
    if (viewModels) {
      viewModels.attach(instance);
      return () => {
        viewModels.detach(instance.id);
        instanceRef.current = null;
      };
    } else {
      instance.mount();
      return () => {
        instance.willUnmount();
        instance.unmount();
        instanceRef.current = null;
      };
    }
  }, []);

  instance.setPayload(payload ?? {});

  return instance;
}
