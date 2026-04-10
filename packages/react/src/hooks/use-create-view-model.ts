import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
  ViewModelsConfig,
} from 'mobx-view-model';
import { viewModelsConfig } from 'mobx-view-model';
import { useContext, useRef } from 'react';
import { flushPendingReactions } from 'yummies/mobx';
import type { Class, IsPartial, Maybe } from 'yummies/types';
import { isViewModelClass } from 'mobx-view-model';
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
  /** Last VM this hook instance attached in render; per-hook, not keyed by `instance.id`. */
  const lastAttachedInstanceRef = useRef<AnyViewModel | null>(null);

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

    const instanceFromStore = viewModels?.get(id);

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

      flushPendingReactions(viewModelsConfig.flushPendingReactions);

      viewModels?.markToBeAttached(instance);

      return instance;
    }
  });

  useIsomorphicLayoutEffect(() => {
    const id = instance.id;
    const vm = instance;
    if (viewModels) {
      return () => {
        void viewModels.detach(id);
        if (lastAttachedInstanceRef.current === vm) {
          lastAttachedInstanceRef.current = null;
        }
      };
    }
    return () => {
      vm.unmount();
      if (lastAttachedInstanceRef.current === vm) {
        lastAttachedInstanceRef.current = null;
      }
    };
  }, [instance]);

  // Same render pass as attach (SSR + first client frame). `flushPendingMobxReactions` is
  // required when the VM is created under mobx-react `observer`: nested `reaction()` otherwise
  // runs after `mount()` in the same tick.
  if (lastAttachedInstanceRef.current !== instance) {
    if (viewModels) {
      void viewModels.attach(instance);
    } else {
      void instance.mount();
    }
    lastAttachedInstanceRef.current = instance;
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
  /** Last VM this hook instance attached in render; per-hook, not keyed by `instance.id`. */
  const lastAttachedInstanceRef = useRef<AnyViewModelSimple | null>(null);

  const instance = useValue(() => {
    const instance = new VM();

    instance.parentViewModel =
      parentViewModel as unknown as (typeof instance)['parentViewModel'];

    flushPendingReactions(viewModelsConfig.flushPendingReactions);

    viewModels?.markToBeAttached(instance);

    return instance;
  });

  useIsomorphicLayoutEffect(() => {
    const id = instance.id;
    const vm = instance;
    if (viewModels) {
      return () => {
        void viewModels.detach(id);
        if (lastAttachedInstanceRef.current === vm) {
          lastAttachedInstanceRef.current = null;
        }
      };
    }
    return () => {
      vm.unmount?.();
      if (lastAttachedInstanceRef.current === vm) {
        lastAttachedInstanceRef.current = null;
      }
    };
  }, [instance]);

  if (lastAttachedInstanceRef.current !== instance) {
    if (viewModels) {
      void viewModels.attach(instance);
    } else {
      void instance.mount?.();
    }
    lastAttachedInstanceRef.current = instance;
  }

  instance.setPayload?.(payload);

  return instance;
};
