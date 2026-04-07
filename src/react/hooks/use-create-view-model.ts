import { useContext, useRef } from 'react';
import type { Class, IsPartial, Maybe } from 'yummies/types';
import type { ViewModelsConfig } from '../../config/index.js';
import { viewModelsConfig } from '../../config/index.js';
import { isViewModelClass } from '../../utils/index.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
} from '../../view-model/index.js';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import { useIsomorphicLayoutEffect, useValue } from '../lib/hooks/index.js';

export interface UseCreateViewModelConfig<TViewModel extends AnyViewModel>
  extends Pick<
    ViewModelCreateConfig<TViewModel>,
    'vmConfig' | 'ctx' | 'component' | 'anchors' | 'props'
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
  const parentViewModel = useContext(ActiveViewModelContext);
  const initialAttachIdRef = useRef<string | null>(null);

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

      viewModels?.markToBeAttached(instance);

      return instance;
    }
  });

  useIsomorphicLayoutEffect(() => {
    const id = instance.id;
    if (viewModels) {
      return () => {
        void viewModels.detach(id);
        initialAttachIdRef.current = null;
      };
    }
    return () => {
      instance.unmount();
      initialAttachIdRef.current = null;
    };
  }, [instance]);

  const instanceId = instance.id ?? null;

  // Not SSR-only: same pass is needed on the client's first render when the VM is
  // not in the store yet (hydration parity, no fallback flash). `typeof window` would miss that.
  // Ref is cleared in the layout-effect cleanup (detach/unmount) so Strict Mode remount runs attach again.
  if (
    initialAttachIdRef.current !== instanceId &&
    (!viewModels || !viewModels.has(instanceId))
  ) {
    initialAttachIdRef.current = instanceId;
    if (viewModels) {
      viewModels.attach(instance);
    } else {
      instance.mount();
    }
  }

  instance.setPayload(payload ?? {});

  return instance;
};

const useCreateViewModelSimple = (
  VM: Class<AnyViewModelSimple>,
  payload?: any,
) => {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  const initialAttachIdRef = useRef<string | null>(null);

  const instance = useValue(() => {
    const instance = new VM();

    instance.parentViewModel =
      parentViewModel as unknown as (typeof instance)['parentViewModel'];

    viewModels?.markToBeAttached(instance);

    return instance;
  });

  useIsomorphicLayoutEffect(() => {
    const id = instance.id;
    if (viewModels) {
      return () => {
        void viewModels.detach(id);
        initialAttachIdRef.current = null;
      };
    }
    return () => {
      instance.unmount?.();
      initialAttachIdRef.current = null;
    };
  }, [instance]);

  const instanceId = instance.id ?? null;

  // Not SSR-only: first client render when the VM is not in the store yet (hydration, CSR).
  // Ref cleared in cleanup so Strict Mode remount re-attaches (see useCreateViewModelBase).
  if (
    initialAttachIdRef.current !== instanceId &&
    (!viewModels || !viewModels.has(instanceId))
  ) {
    initialAttachIdRef.current = instanceId;

    if (viewModels) {
      viewModels.attach(instance);
    } else {
      instance.mount?.();
    }
  }

  instance.setPayload?.(payload);

  return instance;
};
