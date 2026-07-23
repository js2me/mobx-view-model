import { enableObservableTracking } from 'mobx-solid';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
  ViewModelsConfig,
} from 'mobx-view-model';
import {
  isViewModel,
  isViewModelSimple,
  viewModelsConfig,
} from 'mobx-view-model';
import {
  createEffect,
  createUniqueId,
  onCleanup,
  useContext,
} from 'solid-js';
import { isServer } from 'solid-js/web';
import type { AnyObject, Class, IsPartial, Maybe } from 'yummies/types';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';

const EMPTY_OBJECT: AnyObject = Object.freeze({});

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as PromiseLike<unknown>).then === 'function';

const resolvePayload = (payload: unknown) =>
  typeof payload === 'function' ? (payload as () => unknown)() : payload;

export interface UseCreateViewModelConfig<TViewModel extends AnyViewModel>
  extends Pick<
    ViewModelCreateConfig<TViewModel>,
    'vmConfig' | 'ctx' | 'anchors' | 'props'
  > {
  /**
   * Unique identifier for the view
   */
  id?: Maybe<string>;

  /**
   * Function to create an instance of the VM class
   */
  factory?: ViewModelsConfig<TViewModel>['factory'];
}

/**
 * Creates a new ViewModel instance (Solid setup runs once per component).
 *
 * Prefer calling `enableObservableTracking()` from `mobx-solid` once at app entry
 * so MobX reads inside JSX stay reactive — this hook also enables it as a safety net.
 */
export function useCreateViewModel<TViewModel extends AnyViewModel>(
  VM: Class<TViewModel>,
  ...args: IsPartial<TViewModel['payload']> extends true
    ? [
        payload?: TViewModel['payload'] | (() => TViewModel['payload']),
        config?: UseCreateViewModelConfig<TViewModel>,
        _props?: any,
      ]
    : [
        payload: TViewModel['payload'] | (() => TViewModel['payload']),
        config?: UseCreateViewModelConfig<TViewModel>,
        _props?: any,
      ]
): TViewModel;

/**
 * Creates a new ViewModelSimple instance
 */
export function useCreateViewModel<
  TPayload extends AnyObject,
  TViewModelSimple extends ViewModelSimple<TPayload>,
>(
  VM: Class<TViewModelSimple>,
  ...args: IsPartial<TPayload> extends true
    ? [
        payload?: TPayload | (() => TPayload),
        config?: ViewModelCreateConfig<TViewModelSimple>,
      ]
    : [
        payload: TPayload | (() => TPayload),
        config?: ViewModelCreateConfig<TViewModelSimple>,
      ]
): TViewModelSimple;

/**
 * Creates a new ViewModelSimple instance
 */
export function useCreateViewModel<TViewModelSimple>(
  VM: Class<TViewModelSimple>,
): TViewModelSimple;

/**
 * Creates a new ViewModel instance
 */
export function useCreateViewModel(
  VM: Class<any>,
  payload: any = EMPTY_OBJECT,
  rawCfg?: any,
  props?: any,
) {
  enableObservableTracking();

  const viewModels = useContext(ViewModelsContext);
  const parentViewModel = useContext(ActiveViewModelContext);
  const solidId = createUniqueId();
  const initialPayload = resolvePayload(payload);

  const generatedId =
    process.env.NODE_ENV === 'production' ? solidId : `${solidId}:${VM.name}`;
  const id = rawCfg?.id ?? generatedId;

  const config = {
    ...rawCfg,
    id,
    payload: initialPayload,
    VM,
    viewModels,
    parentViewModel,
    ctx: rawCfg?.ctx ?? EMPTY_OBJECT,
    props: props ?? rawCfg?.props,
  } satisfies ViewModelCreateConfig<any>;

  let model: AnyViewModel | AnyViewModelSimple;

  if (viewModels) {
    model = viewModels.define(config);
  } else {
    model = config.factory?.(config) ?? viewModelsConfig.factory(config);
    model.init?.(config);
  }

  const mountResult =
    isViewModel(model) && model.isMounted ? undefined : model.mount?.();

  if (isViewModelSimple(model)) {
    model.parentViewModel = parentViewModel;
    model.setPayload?.(initialPayload);
  }

  onCleanup(() => {
    if (viewModels) {
      viewModels.unmountNew(model);
    } else {
      model.unmount?.();
    }
  });

  createEffect((isUpdate: boolean) => {
    const next = resolvePayload(payload);
    if (isUpdate) {
      model.setPayload?.(next);
    }
    return true;
  }, false);

  if (
    viewModelsConfig.mode === 'ssr' &&
    isThenable(mountResult) &&
    isServer
  ) {
    throw mountResult;
  }

  return model;
}
