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
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  onServerPrefetch,
  unref,
  useId,
  watch,
} from 'vue';
import type { Class, IsPartial } from 'yummies/types';
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

/** Creates a model owned by the current Vue component. */
export function useCreateViewModel(
  VM: Class<any>,
  payload?: MaybeRef<any>,
  rawConfig?: UseCreateViewModelConfig<any>,
) {
  const store = useViewModelsStore();
  const parentViewModel = useActiveViewModel();
  const id = useId();
  const config: ViewModelCreateConfig<any> = {
    ...rawConfig,
    id: rawConfig?.id ?? rawConfig?.generateId?.(rawConfig.ctx ?? {}) ?? id,
    VM,
    payload: unref(payload) ?? {},
    parentViewModel,
    viewModels: store ?? undefined,
    ctx: rawConfig?.ctx ?? {},
    anchors: [getCurrentInstance()?.type, ...(rawConfig?.anchors ?? [])],
  };
  if (store) config.id = store.generateId(config);
  const existing = store?.get(config.id);
  config.data =
    (existing as AnyViewModel | null)?.vm?.data ??
    (store?.resource ?? viewModelsConfig.resource)?.read(config.id);
  const model: AnyViewModel | AnyViewModelSimple =
    existing ??
    (store
      ? store.create(config)
      : (rawConfig?.factory ?? viewModelsConfig.factory)(config));
  if (!existing) {
    if (store) store.connect(model, config);
    else model.init?.({ ...config, viewModels: undefined });
  }
  if (isViewModelSimple(model)) {
    model.parentViewModel = parentViewModel;
    model.setPayload?.(unref(payload));
  }
  const mount = () => {
    if (!isViewModel(model) || !model.isMounted) return model.mount?.();
  };
  onMounted(mount);
  // Vue awaits this hook before rendering the server-side subtree.
  onServerPrefetch(async () => {
    if (viewModelsConfig.mode === 'ssr') await mount();
  });
  onBeforeUnmount(() => {
    if (store) void store.unmount(model);
    else void model.unmount?.();
  });
  watch(
    () => unref(payload),
    (next) => {
      model.setPayload?.(next);
    },
  );
  return model;
}
