import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
  ViewModelsConfig,
  ViewModelStore,
} from 'mobx-view-model';
import {
  _internals,
  isViewModel,
  isViewModelSimple,
  viewModelsConfig,
} from 'mobx-view-model';
import { runInAction } from 'mobx';
import {
  use,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { AnyObject, Class, IsPartial, Maybe } from 'yummies/types';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import {
  cancelPendingForVm,
  claimPendingVm,
  scheduleVmUnmount,
} from './pending-vm-unmount.js';

const EMPTY_ARR: any[] = [];
const { emptyObject, noop } = _internals;
const isProd = process.env.NODE_ENV === 'production';

const subscribeNoop = () => noop;
const getClientHydrated = () => true;
const getServerHydrated = () => false;

type VmInstance = AnyViewModel | AnyViewModelSimple;

type Cache = {
  vm: VmInstance;
  promise?: PromiseLike<void>;
  isSSR: boolean;
  fn: () => () => void;
};

const isAlive = (vm: VmInstance, store: ViewModelStore | null) => {
  if (isViewModel(vm) && !vm.isMounted) return false;
  return !store || !vm.id || store.has(vm.id);
};

const destroyVm = (vm: VmInstance, store: ViewModelStore | null) => {
  if (store) store.unmount(vm);
  else vm.unmount?.();
};

const instantiateVm = (
  id: string,
  VM: Class<any>,
  payload: any,
  rawCfg: any,
  props: any,
  viewModels: ViewModelStore | null,
  parentViewModel: VmInstance | null | undefined,
) =>
  runInAction(() => {
    const config: ViewModelCreateConfig<any> = {
      ...rawCfg,
      id,
      payload,
      VM,
      viewModels,
      parentViewModel,
      ctx: rawCfg?.ctx ?? emptyObject,
      props: props ?? rawCfg?.props,
    };
    if (viewModels) return viewModels.define(config);
    const instance =
      config.factory?.(config) ?? viewModelsConfig.factory(config);
    instance.init?.(config as any);
    return instance;
  });

const bindLifecycle = (
  instance: VmInstance,
  payload: any,
  parentViewModel: VmInstance | null | undefined,
) =>
  runInAction(() => {
    if (isViewModelSimple(instance)) {
      instance.parentViewModel = parentViewModel;
      instance.setPayload?.(payload);
    }
    return isViewModel(instance) && instance.isMounted
      ? undefined
      : instance.mount?.();
  });

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
        _props?: any,
      ]
    : [
        payload: TViewModel['payload'],
        config?: UseCreateViewModelConfig<TViewModel>,
        _props?: any,
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
    ? [payload?: TPayload, config?: ViewModelCreateConfig<TViewModelSimple>]
    : [payload: TPayload, config?: ViewModelCreateConfig<TViewModelSimple>]
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
  payload: any = emptyObject,
  rawCfg?: any,
  props?: any,
) {
  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  const cache = useRef<Cache>(null!);
  const reactId = useId();

  let model = cache.current?.vm;

  if (!model || !isAlive(model, viewModels)) {
    const parentId = parentViewModel?.id ?? null;
    const explicitId = rawCfg?.id as string | null | undefined;
    const claimed =
      !model && explicitId == null
        ? claimPendingVm(VM, parentId)
        : null;

    if (claimed) {
      model = claimed;
    } else {
      cancelPendingForVm(explicitId ?? model?.id);
      model = instantiateVm(
        explicitId ?? model?.id ?? (
          isProd ? reactId : `${reactId}:${VM.name}`
        ),
        VM,
        payload,
        rawCfg,
        props,
        viewModels,
        parentViewModel,
      );
    }

    cache.current = {
      vm: model,
      promise: bindLifecycle(model, payload, parentViewModel) as
        | PromiseLike<void>
        | undefined,
      isSSR: viewModelsConfig.mode === 'ssr',
      fn: () => {
        const vm = cache.current.vm;
        cancelPendingForVm(vm.id);
        return () => {
          scheduleVmUnmount(vm, VM, parentId, () => destroyVm(vm, viewModels));
        };
      },
    };
  } else {
    cancelPendingForVm(model.id);
    model.setPayload?.(payload);
  }

  useEffect(cache.current.fn, EMPTY_ARR);

  if (cache.current.isSSR) {
    const pending = cache.current.promise;
    const isHydrated = useSyncExternalStore(
      subscribeNoop,
      getClientHydrated,
      getServerHydrated,
    );
    if (use && pending && (typeof window === 'undefined' || !isHydrated)) {
      use(pending);
    }
  }

  return model;
}
