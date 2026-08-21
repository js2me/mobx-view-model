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
  /** True while the VM is registered only in the store's staging layer. */
  staged?: boolean;
};

/**
 * Creates AND registers the VM instance during render.
 *
 * With a staging-capable store (client-side), registration goes to the
 * store's staging layer: render-phase lookups keep working via read-through,
 * and only this fiber's commit effect (`commitStaged`) promotes the VM —
 * a discarded fiber's staged entry is dropped by the store. Fallback paths
 * (SSR, stores without staging support, no store) keep the eager
 * registration + unconfirmed-creation cleanup (see pending-vm-unmount).
 *
 * On the server, mount() is called from render so an async willMount can be
 * consumed by React's `use(promise)` SSR flow. On the client, mount() is
 * deferred to the commit effect so discarded fibers never activate
 * subscriptions or other lifecycle side effects.
 */
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
        ? viewModels.defineStaged!(config, stagedOwner)
        : viewModels.define(config)
      : (config.factory?.(config) ?? viewModelsConfig.factory(config));
    if (!viewModels) {
      // `store.define`/`defineStaged` already called init(); the no-store path
      // builds the instance via the factory and must init() manually so
      // ViewModelSimple receives its config before the view reads it.
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

/**
 * Re-registers an existing (revived) instance in the store under its original
 * id. `define` sees no entry (the VM was removed on unmount), calls the
 * factory which returns the same instance, and `connect`s it. This is the
 * revive path (Suspense hide/show on a persisted fiber) — it lives in the
 * react package so the core store API stays free of react-specific concerns.
 */
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

/**
 * Only full ViewModels: for them `vm.id` is the store key. ViewModelSimple may
 * manage its own `id` which differs from the key used at registration.
 */
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
    // Runs once per fiber. The fiber owns its VM: while the fiber is alive the
    // instance is never replaced — see the revive branch below.
    const isSSR = viewModelsConfig.mode === 'ssr';
    const explicitId = rawCfg?.id as string | null | undefined;
    const vmId = explicitId ?? (isProd ? reactId : `${reactId}:${VM.name}`);
    const existing = viewModels?.get(vmId) as VmInstance | null;
    const vmResource = viewModels?.resource ?? viewModelsConfig.resource;
    const vmData = existing
      ? (existing as { vmData?: unknown }).vmData
      : vmResource?.read(vmId);

    // Client + staging-capable store: register into the store's staging
    // layer instead of the committed map — no unconfirmed-creation tracking
    // needed, the store drops discarded fibers' staged entries itself.
    const useStaging =
      typeof window !== 'undefined' &&
      viewModels != null &&
      typeof viewModels.defineStaged === 'function' &&
      typeof viewModels.commitStaged === 'function';

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

    // Orphan tracking is only needed for the eager-registration paths.
    // Staged VMs are dropped by the store itself; on the server there is no
    // commit phase at all, so nothing can ever be confirmed or swept there.
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
        // Fiber committed — confirm the VM is no longer orphaned.
        if (cache.current.creationEntry) {
          confirmCreation(cache.current.creationEntry);
          cache.current.creationEntry = undefined;
        }

        const vm = cache.current.vm;

        // Promote the staged VM to a committed store entry: this fiber is
        // alive. Also schedules the store's sweep of staged entries left
        // behind by fibers discarded during this render pass.
        if (cache.current.staged) {
          cache.current.staged = false;
          viewModels?.commitStaged?.(cache.current.config.id, vm);
        }

        // The VM may have been unmounted between render and this effect (a
        // previous Suspense-hide cleanup ran on the same persisted fiber) —
        // revive the same instance instead of losing it.
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
        }

        return () => {
          // Immediate unmount — no grace period, no reclaim. A Suspense/lazy
          // remount creates a fresh VM (state is lost by design).
          unmountVm(cache.current.vm, viewModels);
        };
      },
    };
  } else {
    const model = cache.current.vm;
    model.setPayload?.(payload);

    // A persisted Suspense fiber can be detached by its previous effect
    // cleanup. Do not revive it here: this render may still be discarded.
    // The commit effect below reattaches and mounts it only after React has
    // confirmed that the fiber is alive.
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
