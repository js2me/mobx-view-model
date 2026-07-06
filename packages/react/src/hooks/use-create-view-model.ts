import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
  ViewModelsConfig,
} from 'mobx-view-model';
import { viewModelsConfig } from 'mobx-view-model';
import { use, useContext, useId, useRef } from 'react';
import { untracked } from 'mobx';
import { flushPendingReactions } from 'yummies/mobx';
import type { AnyObject, Class, IsPartial, Maybe } from 'yummies/types';
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
  if (isViewModelClass(VM)) {
    return useCreateViewModelBase(VM, payload, config);
  }

  return useCreateViewModelSimple(VM, payload);
}

/**
 * React hook lifecycle for ViewModel attach:
 *
 * 1. **Render** — create/reuse instance (`useValue`), then `attach()` (mount + registry).
 *    Same render pass as SSR / first client frame so `withViewModel` can render immediately.
 * 2. **Layout cleanup** — `detach()` on unmount or when the hook's `instance` identity changes.
 *
 * Loop prevention lives in the store (`untracked` registry reads in `isAbleToRenderView`,
 * deferred `attachVMConstructor`) and devtools bridge — not in a split defer/commit hook API.
 */
const useCreateViewModelBase = (
  VM: Class<AnyViewModel>,
  payload?: any,
  config?: Maybe<UseCreateViewModelConfig<AnyViewModel>>,
) => {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  const lastAttachedInstanceRef = useRef<AnyViewModel | null>(null);

  const ctx = config?.ctx ?? {};

  const useReactIds =
    config?.vmConfig?.useReactIds ??
    viewModels?.vmConfig?.useReactIds ??
    viewModelsConfig.useReactIds;
  const renderId = useReactIds ? useId() : undefined;

  const instance = useValue(() => {
    const id =
      viewModels?.generateViewModelId({
        ...config,
        ctx,
        VM,
        renderId,
        parentViewModelId: parentViewModel?.id ?? null,
      }) ??
      config?.id ??
      viewModelsConfig.generateId({
        ...ctx,
        renderId,
      });

    const instanceFromStore = untracked(() => viewModels?.get(id));

    if (instanceFromStore) {
      return instanceFromStore as AnyViewModel;
    }

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

    const created: AnyViewModel =
      config?.factory?.(configCreate) ??
      viewModels?.createViewModel<any>(configCreate) ??
      viewModelsConfig.factory(configCreate);

    flushPendingReactions(viewModelsConfig.flushPendingReactions);

    viewModels?.markToBeAttached(created);

    return created;
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
  }, [instance, viewModels]);

  if (lastAttachedInstanceRef.current !== instance) {
    if (viewModels) {
      void viewModels.attach(instance);
    } else {
      void instance.mount();
    }
    lastAttachedInstanceRef.current = instance;
  }

  instance.setPayload(payload ?? {});

  const suspendUntil =
    config?.vmConfig?.suspendUntil ??
    viewModels?.vmConfig?.suspendUntil ??
    viewModelsConfig.suspendUntil;

  if (suspendUntil != null) {
    const usable = suspendUntil(instance);
    if (usable) {
      use(usable);
    }
  }

  return instance;
};

const useCreateViewModelSimple = (
  VM: Class<AnyViewModelSimple>,
  payload?: any,
) => {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  const lastAttachedInstanceRef = useRef<AnyViewModelSimple | null>(null);

  const instance = useValue(() => {
    const created = new VM();

    created.parentViewModel =
      parentViewModel as unknown as (typeof created)['parentViewModel'];

    flushPendingReactions(viewModelsConfig.flushPendingReactions);

    viewModels?.markToBeAttached(created);

    return created;
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
  }, [instance, viewModels]);

  if (lastAttachedInstanceRef.current !== instance) {
    if (viewModels) {
      void viewModels.attach(instance);
    } else {
      void instance.mount?.();
    }
    lastAttachedInstanceRef.current = instance;
  }

  instance.setPayload?.(payload);

  const suspendUntil =
    viewModels?.vmConfig?.suspendUntil ?? viewModelsConfig.suspendUntil;

  if (suspendUntil != null) {
    const usable = suspendUntil(instance);
    if (usable) {
      use(usable);
    }
  }

  return instance;
};
