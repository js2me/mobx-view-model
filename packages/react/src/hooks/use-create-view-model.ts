import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
  ViewModelsConfig,
} from 'mobx-view-model';
import {
  _internals,
  isViewModel,
  isViewModelSimple,
  viewModelsConfig,
} from 'mobx-view-model';
import { runInAction } from 'mobx';
import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { AnyObject, Class, IsPartial, Maybe } from 'yummies/types';
import { reactUse } from '../lib/react-use.js';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import {
  acquireVm,
  confirmCreation,
  registerUnconfirmed,
  releaseVm,
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
/** Internal revision for non-observable ViewModelSimple values. */
export const viewModelPayloadVersions = new WeakMap<VmInstance, number>();

type Cache = {
  vm: VmInstance;
  appliedPayload: any;
  appliedProps?: any;
  skipForcedCommit?: boolean;
  bindAfterCommit?: boolean;
  promise?: PromiseLike<void>;
  isSSR: boolean;
  fn: () => () => void;
};

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

const mountLifecycle = (instance: VmInstance) =>
  (isViewModel(instance) && instance.isMounted
    ? undefined
    : instance.mount?.()) as PromiseLike<void> | undefined;

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
  let state = cache.current;
  const reactId = useId();
  const isUpdate = !!state;
  const [revision, forceRender] = useState(0);

  // The VM and store belong to this fiber until unmount. Only commit may
  // revive a detached VM: a render can still be discarded by React.
  if (!state) {
    const isClient = _internals.isClient;
    const isSSR = viewModelsConfig.mode === 'ssr';
    const explicitId = rawCfg?.id as string | null | undefined;
    const vmId = explicitId ?? (isProd ? reactId : `${reactId}:${VM.name}`);
    const existing = viewModels?.get(vmId) as VmInstance | null;
    const vmResource = viewModels?.resource ?? viewModelsConfig.resource;
    const data = existing
      ? (existing as { vm?: { data?: any } }).vm?.data
      : vmResource?.read(vmId);

    let staged = isClient && viewModels != null;

    let config!: ViewModelCreateConfig<any>;
    const model: VmInstance = runInAction(() => {
      config = {
        ...rawCfg,
        id: vmId,
        payload,
        data,
        VM,
        viewModels,
        parentViewModel,
        ctx: rawCfg?.ctx ?? emptyObject,
        props: props ?? rawCfg?.props,
      };
      const instance = viewModels
        ? staged
          ? stageViewModel(viewModels, config, cache)
          : viewModels.define(config)
        : (config.factory?.(config) ?? viewModelsConfig.factory(config));
      if (!viewModels) {
        instance.init?.({ ...config, viewModels: undefined } as any);
      }
      return instance;
    });
    const bindAfterCommit =
      isClient && !!viewModels && viewModels.get(config.id) === model;
    if (isClient && !bindAfterCommit) {
      bindModel(model, payload, parentViewModel);
    }
    const lifecycleResult = isClient
      ? undefined
      : runInAction(() => {
          bindModel(model, payload, parentViewModel);
          return mountLifecycle(model);
        });

    let creationEntry =
      staged || !isClient
        ? undefined
        : registerUnconfirmed(model);

    state = cache.current = {
      vm: model,
      appliedPayload: payload,
      appliedProps: props,
      bindAfterCommit,
      promise: lifecycleResult,
      isSSR,
      fn: () => {
        if (creationEntry) {
          confirmCreation(creationEntry);
          creationEntry = undefined;
        }

        if (staged) {
          staged = false;
          commitStagedViewModel(viewModels!, config, model);
        }

        if (viewModels && !viewModels.has(model.id ?? config.id)) {
          runInAction(() => {
            viewModels.define({ ...config, factory: () => model });
          });
        }

        acquireVm(model);
        const mountResult = runInAction(() => mountLifecycle(model));
        if (mountResult) {
          state.promise = mountResult;
        }

        const shouldHydrate =
          isViewModel(model) && model.vm.state === 'mounted' && isSSR;
        if (shouldHydrate) {
          runInAction(() => {
            model.vm.state = 'hydrated';
          });
        }

        return () => releaseVm(model, viewModels);
      },
    };
  }

  const model = state.vm;

  // Defer mutations of an existing VM until React commits this render.
  // The initial render already binds the payload when the VM is created.
  useCommitEffect(() => {
    // Include revision in dependencies so even a stable payload clears the
    // forced-render guard before the next external update.
    if (state.skipForcedCommit) {
      state.skipForcedCommit = false;
      if (state.appliedProps === props) return;
    }
    if (state.bindAfterCommit) {
      state.bindAfterCommit = false;
      runInAction(() => bindModel(model, payload, parentViewModel));
      state.appliedPayload = payload;
      state.appliedProps = props;
    } else if (isUpdate && !Object.is(state.appliedPayload, payload)) {
      state.appliedPayload = payload;
      state.appliedProps = props;
      model.setPayload?.(payload);
    } else {
      return;
    }
    if (isViewModelSimple(model)) {
      viewModelPayloadVersions.set(
        model,
        (viewModelPayloadVersions.get(model) ?? 0) + 1,
      );
      state.skipForcedCommit = true;
      forceRender((revision) => revision + 1);
    }
  }, [payload, revision]);

  // Bind a reused VM before mount() starts work from its committed payload.
  useCommitEffect(state.fn, EMPTY_ARR);

  if (state.isSSR) {
    const pending = state.promise;
    const isHydrated = useSyncExternalStore(
      subscribeNoop,
      getClientHydrated,
      getServerHydrated,
    );
    if (reactUse && pending && (!_internals.isClient || !isHydrated)) {
      reactUse(pending);
    }
  }

  return model;
}
