/* eslint-disable react-hooks/rules-of-hooks */
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import {
  AnyObject,
  Class,
  AllPropertiesOptional,
  Maybe,
} from 'yummies/utils/types';

import { viewModelsConfig } from '../config/global-config.js';
import { mergeVMConfigs } from '../config/utils/merge-vm-configs.js';
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
    'config' | 'ctx' | 'component' | 'componentProps'
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
  const [instance] = useState(() => new VM());

  if ('setPayload' in instance) {
    useLayoutEffect(() => {
      instance.setPayload!(payload);
    }, [payload]);
  }

  useIsomorphicLayoutEffect(() => {
    instance.mount?.();
    return () => {
      instance.unmount?.();
    };
  }, []);

  return instance;
};

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

export function useCreateViewModel<TViewModelSimple extends ViewModelSimple>(
  VM: Class<TViewModelSimple>,
  ...args: TViewModelSimple extends ViewModelSimple<infer TPayload>
    ? AllPropertiesOptional<TPayload> extends true
      ? [payload?: TPayload]
      : [payload: TPayload]
    : []
): TViewModelSimple;

export function useCreateViewModel(VM: Class<any>, ...args: any[]) {
  const [payload, config] = args;

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
  const lastInstance = useRef<AnyViewModel | null>(null);

  const [instance] = useState((): AnyViewModel => {
    if (instanceFromStore) {
      return instanceFromStore as AnyViewModel;
    }

    if (lastInstance.current) {
      return lastInstance.current;
    }

    const configCreate: ViewModelCreateConfig<any> = {
      ...config,
      config: config?.config,
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
        config: mergeVMConfigs(configCreate.config),
      } satisfies ViewModelParams<any>);

    lastInstance.current = instance;

    instance.willMount();

    if (viewModels) {
      viewModels.markToBeAttached(instance);
    }

    return instance;
  });

  useIsomorphicLayoutEffect(() => {
    if (viewModels) {
      viewModels.attach(instance);
      return () => {
        viewModels.detach(instance.id);
        lastInstance.current = null;
      };
    } else {
      instance.mount();
      return () => {
        instance.willUnmount();
        instance.unmount();
        lastInstance.current = null;
      };
    }
  }, []);

  instance.setPayload(payload ?? {});

  return instance;
}
