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

const DBG = !isProd;
const dbg = DBG ? (...args: any[]) => console.log('[useCreateVM]', ...args) : noop;
/** Debug-only safe accessors — ViewModelSimple has no lifecycle props. */
const dbgLc = (vm: unknown) => (vm as { lifecycleState?: unknown } | null | undefined)?.lifecycleState;
const dbgIm = (vm: unknown) => (vm as { isMounted?: unknown } | null | undefined)?.isMounted;

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
};

/**
 * Creates AND registers the VM instance in the store during render.
 *
 * Registration stays in render (not deferred to the effect) so that
 * `useViewModel(class/ref/id)` and VM computeds that read
 * `this.viewModels.get(...)` during render keep working — children and
 * siblings render before the parent's effect, so the VM must already be in
 * the store by the time anyone looks it up. The orphan that this creates (a
 * fiber discarded by React 19 registers + mounts but never commits) is
 * cleaned up by the unconfirmed-creation setTimeout in pending-vm-unmount.
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
      ? viewModels.define(config)
      : (config.factory?.(config) ?? viewModelsConfig.factory(config));
    if (!viewModels) {
      // `store.define` → `connect` already called init(); the no-store path
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

  dbg('--- ENTER', VM.name, 'id=', reactId, 'hasCache=', !!cache.current?.vm, 'cacheVmId=', cache.current?.vm?.id, 'cacheVmLifecycle=', dbgLc(cache.current?.vm), 'cacheVmIsMounted=', dbgIm(cache.current?.vm));

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

    dbg('INSTANTIATE', VM.name, 'vmId=', vmId, 'hasVmData=', vmData !== undefined);
    const { instance: model, config } = instantiateVm(
      vmId,
      VM,
      payload,
      vmData,
      rawCfg,
      props,
      viewModels,
      parentViewModel,
    );
    if (typeof window !== 'undefined') {
      bindModel(model, payload, parentViewModel);
    }
    dbg('INSTANTIATED', VM.name, 'vmId=', model.id, 'lifecycleState=', dbgLc(model), 'isMounted=', dbgIm(model));

    dbg('BIND LIFECYCLE', model.id, 'lifecycleState-before=', dbgLc(model), 'isMounted-before=', dbgIm(model));
    const lifecycleResult =
      typeof window === 'undefined'
        ? (bindLifecycle(model, payload, parentViewModel) as
            | PromiseLike<void>
            | undefined)
        : undefined;
    dbg('BIND LIFECYCLE DONE', model.id, 'lifecycleState-after=', dbgLc(model), 'isMounted-after=', dbgIm(model), 'promise=', !!lifecycleResult);

    const vm = model;

    // Register as unconfirmed — the VM is registered during render. On the
    // server it is also mounted for SSR; on the client mount waits for commit.
    // A fiber discarded by React still needs store cleanup. Keying by VM
    // instance lets shared explicit IDs collapse to one entry.
    const creationEntry = registerUnconfirmed(vm, viewModels);

    cache.current = {
      vm,
      config,
      promise: lifecycleResult,
      isSSR,
      creationEntry,
      fn: () => {
        // Fiber committed — confirm the VM is no longer orphaned.
        if (cache.current.creationEntry) {
          confirmCreation(cache.current.creationEntry);
          cache.current.creationEntry = undefined;
        }

        const vm = cache.current.vm;

        // The VM may have been unmounted between render and this effect (a
        // previous Suspense-hide cleanup ran on the same persisted fiber) —
        // revive the same instance instead of losing it.
        if (isDetachedFromStore(vm, viewModels)) {
          dbg('EFFECT reattach', vm.id);
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
          // Immediate unmount — no grace period, no reclaim. A Suspense/lazy
          // remount creates a fresh VM (state is lost by design).
          unmountVm(cache.current.vm, viewModels);
        };
      },
    };
  } else {
    const model = cache.current.vm;
    model.setPayload?.(payload);

    // The fiber owns this VM — it is never replaced here. If the VM was
    // unmounted while the fiber was hidden (Suspense), revive the same
    // instance. Suspense hide → effect cleanup → immediate unmount; when the
    // fiber re-renders, re-register + mount it again.
    const detached = isDetachedFromStore(model, viewModels);
    const needsRevive =
      detached ||
      (isViewModel(model) &&
        (model.lifecycleState === 'unmounted' ||
          model.lifecycleState === 'unmounting'));

    if (needsRevive) {
      dbg('REVIVE VM', model.id, 'lifecycleState=', dbgLc(model), 'detached=', detached);
      if (detached && viewModels) {
        reattachVm(model, cache.current.config, viewModels);
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

  useCommitEffect(cache.current.fn, EMPTY_ARR);

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
