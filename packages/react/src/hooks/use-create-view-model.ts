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
  claimPendingVmById,
  scheduleVmUnmount,
} from './pending-vm-unmount.js';

const EMPTY_ARR: any[] = [];
const { emptyObject, noop } = _internals;
const isProd = process.env.NODE_ENV === 'production';

const DBG = !isProd;
const dbg = DBG ? (...args: any[]) => console.log('[useCreateVM]', ...args) : noop;
/** Debug-only safe accessors — ViewModelSimple has no lifecycle props. */
const dbgLc = (vm: unknown) => (vm as { lifecycleState?: unknown } | null | undefined)?.lifecycleState;
const dbgIm = (vm: unknown) => (vm as { isMounted?: unknown } | null | undefined)?.isMounted;

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

const instantiateVm = (
  id: string,
  VM: Class<any>,
  payload: any,
  rawCfg: any,
  props: any,
  viewModels: ViewModelStore | null,
  parentViewModel: VmInstance | null | undefined,
): VmInstance =>
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

/** Re-registers an existing (revived) instance in the store under its own id. */
const reattachVm = (
  vm: VmInstance,
  VM: Class<any>,
  rawCfg: any,
  props: any,
  viewModels: ViewModelStore,
  parentViewModel: VmInstance | null | undefined,
) =>
  runInAction(() =>
    viewModels.define({
      ...rawCfg,
      id: vm.id,
      payload: (vm as { payload?: any }).payload,
      VM,
      viewModels,
      parentViewModel,
      ctx: rawCfg?.ctx ?? emptyObject,
      props: props ?? rawCfg?.props,
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

  dbg('--- ENTER', VM.name, 'id=', reactId, 'hasCache=', !!cache.current?.vm, 'cacheVmId=', cache.current?.vm?.id, 'cacheVmLifecycle=', dbgLc(cache.current?.vm), 'cacheVmIsMounted=', dbgIm(cache.current?.vm));

  if (!cache.current) {
    // Runs once per fiber. The fiber owns its VM: while the fiber is alive the
    // instance is never replaced — see the revive branch below.
    const isSSR = viewModelsConfig.mode === 'ssr';
    const parentId = parentViewModel?.id ?? null;
    const explicitId = rawCfg?.id as string | null | undefined;

    // Fallback for fiber death + immediate recreation (Suspense/lazy remounts
    // destroy hook state together with useId): reclaim the instance whose
    // unmount is still pending. Payload discriminates same-class siblings.
    let model =
      explicitId == null
        ? claimPendingVm(VM, parentId, viewModels, payload)
        : claimPendingVmById(explicitId, VM, viewModels);

    if (model) {
      dbg('CLAIMED VM', model.id, 'lifecycleState=', dbgLc(model), 'isMounted=', dbgIm(model));
      model.setPayload?.(payload);
    } else {
      const vmId = explicitId ?? (isProd ? reactId : `${reactId}:${VM.name}`);
      // A pending unmount scheduled under the same id would delete the store
      // entry we are about to (re)use — cancel it. `define` then returns the
      // existing instance if one is still registered under this id.
      cancelPendingForVm(vmId);
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
      dbg('INSTANTIATED', VM.name, 'vmId=', model.id, 'lifecycleState=', dbgLc(model), 'isMounted=', dbgIm(model));
    }

    dbg('BIND LIFECYCLE', model.id, 'lifecycleState-before=', dbgLc(model), 'isMounted-before=', dbgIm(model));
    const lifecycleResult = bindLifecycle(model, payload, parentViewModel) as
      | PromiseLike<void>
      | undefined;
    dbg('BIND LIFECYCLE DONE', model.id, 'lifecycleState-after=', dbgLc(model), 'isMounted-after=', dbgIm(model), 'promise=', !!lifecycleResult);

    const vm = model;
    cache.current = {
      vm,
      promise: lifecycleResult,
      isSSR,
      fn: () => {
        cancelPendingForVm(vm.id);

        // The grace microtask may have unmounted the VM between render and
        // this effect (or between effect cycles while Suspense hid the tree) —
        // revive the same instance instead of losing it.
        if (isDetachedFromStore(vm, viewModels)) {
          dbg('EFFECT reattach', vm.id);
          reattachVm(vm, VM, rawCfg, props, viewModels, parentViewModel);
          runInAction(() => vm.mount?.());
        } else if (isViewModel(vm) && !vm.isMounted) {
          runInAction(() => vm.mount());
        }

        const shouldHydrate = isViewModel(vm) && vm.lifecycleState === 'mounted' && cache.current.isSSR;
        dbg('EFFECT fn', 'vmId=', vm.id, 'lifecycleState=', dbgLc(vm), 'isSSR=', cache.current.isSSR, 'shouldHydrate=', shouldHydrate);
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
    const model = cache.current.vm;
    model.setPayload?.(payload);

    // The fiber owns this VM — it is never replaced here. If the VM was
    // unmounted while the fiber was hidden (Suspense) or dropped from the
    // store, revive the same instance.
    const detached = isDetachedFromStore(model, viewModels);
    const needsRevive =
      detached ||
      (isViewModel(model) &&
        (model.lifecycleState === 'unmounted' ||
          model.lifecycleState === 'unmounting'));

    if (needsRevive) {
      dbg('REVIVE VM', model.id, 'lifecycleState=', dbgLc(model), 'detached=', detached);
      if (detached) {
        reattachVm(model, VM, rawCfg, props, viewModels, parentViewModel);
      }
      cache.current.promise =
        (bindLifecycle(model, payload, parentViewModel) as
          | PromiseLike<void>
          | undefined) ?? cache.current.promise;
    } else {
      dbg('REUSE VM', model.id, 'lifecycleState=', dbgLc(model), 'isMounted=', dbgIm(model));
    }
  }

  const model = cache.current.vm;

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

  dbg('RETURN', VM.name, 'vmId=', model.id, 'lifecycleState=', dbgLc(model), 'isMounted=', dbgIm(model));

  return model;
}
