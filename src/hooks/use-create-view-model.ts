import { runInAction } from 'mobx';
import { useContext, useRef, useState } from 'react';
import { AnyObject, Class, EmptyObject, Maybe } from 'yummies/utils/types';

import { viewModelsConfig } from '../config/global-config.js';
import { mergeVMConfigs } from '../config/utils/merge-vm-configs.js';
import { ActiveViewModelContext } from '../contexts/active-view-context.js';
import { ViewModelsContext } from '../contexts/view-models-context.js';
import { useIsomorphicLayoutEffect } from '../lib/hooks/use-isomorphic-layout-effect.js';
import { generateVMId } from '../utils/create-vm-id-generator.js';
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

export const useCreateViewModel = <TViewModel extends AnyViewModel>(
  VM: Class<TViewModel>,
  ...args: TViewModel['payload'] extends EmptyObject
    ? [
        payload?: TViewModel['payload'],
        config?: UseCreateViewModelConfig<TViewModel>,
      ]
    : [
        payload: TViewModel['payload'],
        config?: UseCreateViewModelConfig<TViewModel>,
      ]
) => {
  const [payload, config] = args;

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
  const lastInstance = useRef<TViewModel | null>(null);

  const [instance] = useState((): TViewModel => {
    if (instanceFromStore) {
      return instanceFromStore as TViewModel;
    }

    if (lastInstance.current) {
      return lastInstance.current;
    }

    const configCreate: ViewModelCreateConfig<any> = {
      ...config,
      config: config?.config,
      id,
      parentViewModelId: parentViewModel?.id,
      payload,
      VM,
      viewModels,
      parentViewModel,
      ctx,
    };

    viewModels?.processCreateConfig(configCreate);

    const instance: TViewModel =
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
        runInAction(() => {
          instance.isUnmounting = true;
        });
        instance.willUnmount();
        instance.unmount();
        lastInstance.current = null;
        runInAction(() => {
          instance.isUnmounting = false;
        });
      };
    }
  }, []);

  instance.setPayload(payload);

  return instance;
};
