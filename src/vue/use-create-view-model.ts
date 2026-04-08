import {
  getCurrentInstance,
  isRef,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  watch,
} from 'vue';
import type { Class, IsPartial, Maybe } from 'yummies/types';
import { viewModelsConfig } from '../config/index.js';
import { isViewModelClass } from '../utils/index.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
} from '../view-model/index.js';
import type { MaybeRef, UseCreateViewModelConfig } from './types.js';
import { useActiveViewModel } from './use-active-view-model.js';
import { useViewModelsStore } from './use-view-model-store.js';

export function useCreateViewModel<TViewModel extends AnyViewModel>(
  VM: Class<TViewModel>,
  ...args: IsPartial<TViewModel['payload']> extends true
    ? [
        payload?: MaybeRef<TViewModel['payload']>,
        config?: UseCreateViewModelConfig<TViewModel>,
      ]
    : [
        payload: MaybeRef<TViewModel['payload']>,
        config?: UseCreateViewModelConfig<TViewModel>,
      ]
): TViewModel;

export function useCreateViewModel<TViewModelSimple extends ViewModelSimple>(
  VM: Class<TViewModelSimple>,
  ...args: TViewModelSimple extends ViewModelSimple<infer TPayload>
    ? IsPartial<TPayload> extends true
      ? [payload?: MaybeRef<TPayload>]
      : [payload: MaybeRef<TPayload>]
    : []
): TViewModelSimple;

export function useCreateViewModel<TViewModelSimple>(
  VM: Class<TViewModelSimple>,
): TViewModelSimple;

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

const useCreateViewModelBase = (
  VM: Class<AnyViewModel>,
  payload?: MaybeRef<any>,
  config?: Maybe<UseCreateViewModelConfig<AnyViewModel>>,
) => {
  const viewModels = useViewModelsStore();
  const parentViewModel = useActiveViewModel();
  const ctx = config?.ctx ?? {};
  const instanceComponent = config?.component ?? getCurrentInstance()?.type;

  const isPayloadRef = isRef(payload);
  const resolvePayloadValue = () => unref(payload) ?? {};

  const id =
    viewModels?.generateViewModelId({
      ...config,
      ctx,
      VM,
      parentViewModelId: parentViewModel?.id ?? null,
    }) ??
    config?.id ??
    viewModelsConfig.generateId(ctx);

  const instanceFromStore = viewModels
    ? (viewModels.get(id) as AnyViewModel | null)
    : null;

  const instance: AnyViewModel =
    instanceFromStore ??
    (() => {
      const configCreate: ViewModelCreateConfig<any> = {
        ...config,
        vmConfig: config?.vmConfig,
        id,
        parentViewModelId: parentViewModel?.id,
        payload: resolvePayloadValue(),
        VM,
        viewModels,
        parentViewModel: parentViewModel ?? undefined,
        ctx,
        component: instanceComponent as any,
        anchors: config?.anchors as any,
        props: config?.props,
      };

      viewModels?.processCreateConfig(configCreate);

      const instance: AnyViewModel =
        config?.factory?.(configCreate) ??
        viewModels?.createViewModel<any>(configCreate) ??
        viewModelsConfig.factory(configCreate);

      viewModels?.markToBeAttached(instance);

      return instance;
    })();

  onMounted(() => {
    if (viewModels) {
      void viewModels.attach(instance);
    } else {
      void instance.mount();
    }
  });

  onBeforeUnmount(() => {
    if (viewModels) {
      void viewModels.detach(instance.id);
    } else {
      void instance.unmount();
    }
  });

  if (isPayloadRef && payload) {
    watch(
      payload,
      () => {
        instance.setPayload(unref(payload));
      },
      { immediate: true },
    );
  } else {
    watch(
      () => resolvePayloadValue(),
      (nextPayload) => {
        instance.setPayload(nextPayload);
      },
      { immediate: true },
    );
  }

  return instance;
};

const useCreateViewModelSimple = (
  VM: Class<AnyViewModelSimple>,
  payload?: MaybeRef<any>,
) => {
  const viewModels = useViewModelsStore();
  const parentViewModel = useActiveViewModel();
  const payloadRef = isRef(payload) ? payload : ref(payload);

  const instance = new VM();

  instance.parentViewModel =
    parentViewModel as unknown as (typeof instance)['parentViewModel'];

  viewModels?.markToBeAttached(instance);

  if ('setPayload' in instance) {
    watch(
      payloadRef,
      () => {
        instance.setPayload?.(payloadRef);
      },
      { immediate: true },
    );
  }

  onMounted(() => {
    if (viewModels) {
      viewModels.attach(instance);
    } else {
      instance.mount?.();
    }
  });

  onBeforeUnmount(() => {
    if (viewModels) {
      viewModels.detach(instance.id);
    } else {
      instance.unmount?.();
    }
  });

  return instance;
};
