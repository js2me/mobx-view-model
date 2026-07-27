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

const DBG = !isProd;
const dbg = DBG ? (...args: any[]) => console.log('[useCreateVM]', ...args) : noop;

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
  if (isViewModel(vm) && !vm.isMounted && vm.lifecycleState !== 'mounting') return false;
  return !store || !vm.id || store.has(vm.id);
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

  const isSSR = viewModelsConfig.mode === 'ssr';
  const isClient = typeof window !== 'undefined';

  let model = cache.current?.vm;

  dbg('--- ENTER', VM.name, 'id=', reactId, 'isSSR=', isSSR, 'isClient=', isClient, 'hasCache=', !!cache.current?.vm, 'cacheVmId=', cache.current?.vm?.id, 'cacheVmLifecycle=', cache.current?.vm?.lifecycleState, 'cacheVmIsMounted=', cache.current?.vm?.isMounted);

  if (!model || !isAlive(model, viewModels)) {
    dbg('CREATE NEW VM', VM.name, 'oldModel=', model?.id, 'oldLifecycle=', model?.lifecycleState, 'isAlive=', model ? isAlive(model, viewModels) : 'no-model');
    const parentId = parentViewModel?.id ?? null;
    const explicitId = rawCfg?.id as string | null | undefined;
    const claimed =
      !model && explicitId == null
        ? claimPendingVm(VM, parentId)
        : null;

    dbg('claimPendingVm result=', claimed?.id, 'parentId=', parentId, 'explicitId=', explicitId);

    if (claimed) {
      model = claimed;
      dbg('CLAIMED VM', model.id, 'lifecycleState=', model.lifecycleState, 'isMounted=', model.isMounted);
    } else {
      cancelPendingForVm(explicitId ?? model?.id);
      const vmId = explicitId ?? model?.id ?? (
        isProd ? reactId : `${reactId}:${VM.name}`
      );
      dbg('INSTANTIATE', VM.name, 'vmId=', vmId);
      model = instantiateVm(
        vmId,
        VM,
        payload,
        rawCfg,
        props,
        viewModels,
        parentViewModel,
      );
      dbg('INSTANTIATED', VM.name, 'vmId=', model.id, 'lifecycleState=', model.lifecycleState, 'isMounted=', model.isMounted);
    }

    dbg('BIND LIFECYCLE', model.id, 'lifecycleState-before=', model.lifecycleState, 'isMounted-before=', model.isMounted);
    const lifecycleResult = bindLifecycle(model, payload, parentViewModel) as
      | PromiseLike<void>
      | undefined;
    dbg('BIND LIFECYCLE DONE', model.id, 'lifecycleState-after=', model.lifecycleState, 'isMounted-after=', model.isMounted, 'promise=', !!lifecycleResult);

    cache.current = {
      vm: model,
      promise: lifecycleResult,
      isSSR,
      fn: () => {
        const vm = cache.current.vm;
        cancelPendingForVm(vm.id);
        const shouldHydrate = isViewModel(vm) && vm.lifecycleState === 'mounted' && cache.current.isSSR;
        dbg('EFFECT fn', 'vmId=', vm.id, 'lifecycleState=', vm.lifecycleState, 'isSSR=', cache.current.isSSR, 'shouldHydrate=', shouldHydrate);
        // Transition to 'hydrated' ONLY in SSR mode.
        // Mount effect confirms React committed the component on the client.
        // In SSR mode this means hydration succeeded — VMs can check
        // lifecycleState === 'hydrated' to safely render dynamic content
        // that would cause hydration mismatches.
        // In CSR mode lifecycleState stays 'mounted' — no hydration phase.
        if (shouldHydrate) {
          runInAction(() => {
            (vm as any).lifecycleState = 'hydrated';
          });
          dbg('EFFECT lifecycleState→hydrated', vm.id);
        }

        return () => {
          scheduleVmUnmount(vm, VM, parentId, viewModels);
        };
      },
    };
  } else {
    dbg('REUSE VM', model.id, 'lifecycleState=', model.lifecycleState, 'isMounted=', model.isMounted);
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
    dbg('SSR BLOCK', model.id, 'isHydrated=', isHydrated, 'pending=', !!pending, 'use=', !!use);
    if (use && pending && (typeof window === 'undefined' || !isHydrated)) {
      dbg('SSR use(pending)', model.id);
      use(pending);
    }
  }

  dbg('RETURN', VM.name, 'vmId=', model.id, 'lifecycleState=', model.lifecycleState, 'isMounted=', model.isMounted);

  return model;
}
