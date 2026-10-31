import {
  type AnyViewModel,
  type AnyViewModelSimple,
  isViewModel,
  isViewModelSimple,
  type ViewModelCreateConfig,
  type ViewModelSimple,
  viewModelsConfig,
} from 'mobx-view-model';
import {
  onBeforeUnmount,
  onMounted,
  onServerPrefetch,
  unref,
  useId,
  watch,
} from 'vue';
import type { AnyObject, Class, IsPartial } from 'yummies/types';
import { retainModel } from './model-ownership.js';
import { registerModelRevision } from './model-revision.js';
import type {
  UseCreateViewModelConfig,
  ViewModelPayloadSource,
} from './types.js';
import { useActiveViewModel } from './use-active-view-model.js';
import { useViewModelsStore } from './use-view-model-store.js';

const EMPTY_OBJECT = Object.freeze({});
const resolvePayload = (source: any) =>
  typeof source === 'function' ? source() : unref(source);

export function useCreateViewModel<TViewModel extends AnyViewModel>(
  VM: Class<TViewModel>,
  ...args: IsPartial<TViewModel['payload']> extends true
    ? [
        payload?: ViewModelPayloadSource<TViewModel['payload']>,
        config?: UseCreateViewModelConfig<TViewModel>,
        _props?: any,
      ]
    : [
        payload: ViewModelPayloadSource<TViewModel['payload']>,
        config?: UseCreateViewModelConfig<TViewModel>,
        _props?: any,
      ]
): TViewModel;

export function useCreateViewModel<
  TPayload extends AnyObject,
  TViewModelSimple extends ViewModelSimple<TPayload>,
>(
  VM: Class<TViewModelSimple>,
  ...args: IsPartial<TPayload> extends true
    ? [
        payload?: ViewModelPayloadSource<TPayload>,
        config?: ViewModelCreateConfig<TViewModelSimple>,
      ]
    : [
        payload: ViewModelPayloadSource<TPayload>,
        config?: ViewModelCreateConfig<TViewModelSimple>,
      ]
): TViewModelSimple;

export function useCreateViewModel<TViewModelSimple>(
  VM: Class<TViewModelSimple>,
): TViewModelSimple;

/** Creates a model owned by the current Vue component. */
export function useCreateViewModel(
  VM: Class<any>,
  payload: ViewModelPayloadSource<any> = EMPTY_OBJECT,
  rawConfig?: UseCreateViewModelConfig<any>,
  props?: any,
) {
  const store = useViewModelsStore();
  const parentViewModel = useActiveViewModel();
  const id = useId();
  const initialPayload = resolvePayload(payload);
  const config: ViewModelCreateConfig<any> = {
    ...rawConfig,
    id:
      rawConfig?.id ??
      (process.env.NODE_ENV === 'production' ? id : `${id}:${VM.name}`),
    VM,
    payload: initialPayload,
    parentViewModel,
    viewModels: store ?? undefined,
    ctx: rawConfig?.ctx ?? {},
    anchors: rawConfig?.anchors,
    props: props ?? rawConfig?.props,
  };
  if (store) config.id = store.generateId(config);
  const existing = store?.get(config.id);
  config.data = existing
    ? (existing as AnyViewModel).vm?.data
    : (store?.resource ?? viewModelsConfig.resource)?.read(config.id);
  const model: AnyViewModel | AnyViewModelSimple =
    existing ??
    (store
      ? store.create(config)
      : (rawConfig?.factory ?? viewModelsConfig.factory)(config));
  if (!existing) {
    // Custom factories may return a simple model without an ID, just like
    // the default factory. Assign the canonical ID before the store indexes it.
    if (isViewModelSimple(model)) model.id ??= config.id;
    if (store) store.connect(model, config);
    else model.init?.({ ...config, viewModels: undefined });
  }
  if (isViewModelSimple(model)) {
    model.parentViewModel = parentViewModel;
    model.setPayload?.(initialPayload);
  }
  const revision = isViewModelSimple(model)
    ? registerModelRevision(model)
    : null;
  const retained = store ? retainModel(store, model) : null;
  // Payload and parent must be available to simple-model mount hooks.
  const mountResult =
    retained && retained.ownership.count > 1
      ? retained.ownership.mountResult
      : isViewModel(model) && model.isMounted
        ? undefined
        : model.mount?.();
  if (retained) retained.ownership.mountResult = mountResult;
  // Route asynchronous client failures through Vue lifecycle error handling.
  onMounted(() => mountResult);
  // Vue awaits server-prefetch before rendering the subtree.
  onServerPrefetch(async () => {
    if (viewModelsConfig.mode === 'ssr') await mountResult;
  });
  onBeforeUnmount(() => {
    if (retained) retained.release();
    else void model.unmount?.();
  });
  watch(
    () => resolvePayload(payload),
    (next) => {
      model.setPayload?.(next);
      if (revision) revision.value++;
    },
  );
  return model;
}
