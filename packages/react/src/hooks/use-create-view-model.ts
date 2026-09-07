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
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { AnyObject, Class, IsPartial, Maybe } from 'yummies/types';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import {
  type UnconfirmedCreation,
  confirmCreation,
  registerUnconfirmed,
  unmountVm,
} from './pending-vm-unmount.js';
import { commitStagedViewModel, stageViewModel } from './staged-view-model.js';

const EMPTY_ARR: any[] = [];
const { emptyObject, noop } = _internals;
const isProd = process.env.NODE_ENV === 'production';

const subscribeNoop = () => noop;
const getClientHydrated = () => true;
const getServerHydrated = () => false;
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

type VmInstance = AnyViewModel | AnyViewModelSimple;

type Cache = {
  vm: VmInstance;
  config: ViewModelCreateConfig<any>;
  promise?: PromiseLike<void>;
  isSSR: boolean;
  fn: () => () => void;
  creationEntry?: UnconfirmedCreation;
  staged?: boolean;
};

const instantiateVm = (
  id: string,
  VM: Class<any>,
  payload: any,
  vmData: unknown,
  rawCfg: any,
  props: any,
  viewModels: ViewModelStore | null,
  parentViewModel: VmInstance | null | undefined,
  stagedOwner?: object,
): { instance: VmInstance; config: ViewModelCreateConfig<any> } =>
  runInAction(() => {
    const config: ViewModelCreateConfig<any> = {
      ...rawCfg,
      id,
      payload,
      vmData,
      VM,
      viewModels,
      parentViewModel,
      ctx: rawCfg?.ctx ?? emptyObject,
      props: props ?? rawCfg?.props,
    };
    const instance: VmInstance = viewModels
      ? stagedOwner
        ? stageViewModel(viewModels, config, stagedOwner)
        : viewModels.define(config)
      : (config.factory?.(config) ?? viewModelsConfig.factory(config));
    if (!viewModels) {
      instance.init?.({ ...config, viewModels: undefined } as any);
    }
    return { instance, config };
  });

const bindModel = (
  instance: VmInstance,
  payload: any,
  parentViewModel: VmInstance | null | undefined,
) => {
  if (isViewModelSimple(instance)) {
    instance.parentViewModel = parentViewModel;
    instance.setPayload?.(payload);
  }
};

const bindLifecycle = (
  instance: VmInstance,
  payload: any,
  parentViewModel: VmInstance | null | undefined,
) =>
  runInAction(() => {
    bindModel(instance, payload, parentViewModel);
    return isViewModel(instance) && instance.isMounted
      ? undefined
      : instance.mount?.();
  });

const mountLifecycle = (instance: VmInstance) =>
  runInAction(() =>
    isViewModel(instance) && instance.isMounted
      ? undefined
      : instance.mount?.(),
  );

const reattachVm = (
  vm: VmInstance,
  config: ViewModelCreateConfig<any>,
  viewModels: ViewModelStore,
) =>
  runInAction(() =>
    viewModels.define({
      ...config,
      factory: () => vm,
    }),
  );

const isDetachedFromStore = (
  vm: VmInstance,
  store: ViewModelStore | null,
): store is ViewModelStore =>
  !!store && isViewModel(vm) && vm.id != null && !store.has(vm.id);

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

  if (!cache.current) {
    const isSSR = viewModelsConfig.mode === 'ssr';
    const explicitId = rawCfg?.id as string | null | undefined;
    const vmId = explicitId ?? (isProd ? reactId : `${reactId}:${VM.name}`);
    const existing = viewModels?.get(vmId) as VmInstance | null;
    const vmResource = viewModels?.resource ?? viewModelsConfig.resource;
    const vmData = existing
      ? (existing as { vmData?: unknown }).vmData
      : vmResource?.read(vmId);

    const useStaging = typeof window !== 'undefined' && viewModels != null;

    const { instance: model, config } = instantiateVm(
      vmId,
      VM,
      payload,
      vmData,
      rawCfg,
      props,
      viewModels,
      parentViewModel,
      useStaging ? cache : undefined,
    );
    if (typeof window !== 'undefined') {
      bindModel(model, payload, parentViewModel);
    }
    const lifecycleResult =
      typeof window === 'undefined'
        ? (bindLifecycle(model, payload, parentViewModel) as
            | PromiseLike<void>
            | undefined)
        : undefined;

    const vm = model;

    const creationEntry =
      useStaging || typeof window === 'undefined'
        ? undefined
        : registerUnconfirmed(vm, viewModels);

    cache.current = {
      vm,
      config,
      promise: lifecycleResult,
      isSSR,
      creationEntry,
      staged: useStaging || undefined,
      fn: () => {
        if (cache.current.creationEntry) {
          confirmCreation(cache.current.creationEntry);
          cache.current.creationEntry = undefined;
        }

        const vm = cache.current.vm;

        if (cache.current.staged) {
          cache.current.staged = false;
          commitStagedViewModel(viewModels!, cache.current.config, vm);
        }

        if (isDetachedFromStore(vm, viewModels)) {
          reattachVm(vm, cache.current.config, viewModels!);
        }

        const mountResult = mountLifecycle(vm) as
          | PromiseLike<void>
          | undefined;
        if (mountResult) {
          cache.current.promise = mountResult;
        }

        const shouldHydrate =
          isViewModel(vm) && vm.lifecycleState === 'mounted' && cache.current.isSSR;
        if (shouldHydrate) {
          runInAction(() => {
            (vm as any).lifecycleState = 'hydrated';
          });
        }

        return () => {
          unmountVm(cache.current.vm, viewModels);
        };
      },
    };
  } else {
    const model = cache.current.vm;
    model.setPayload?.(payload);
    // Don't revive here — this render may still be discarded.
    // The commit effect reattaches after React confirms the fiber is alive.
  }

  const model = cache.current.vm;

  useCommitEffect(cache.current.fn, EMPTY_ARR);

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
