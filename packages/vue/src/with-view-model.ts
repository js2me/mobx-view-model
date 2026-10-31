import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelComponentRef,
  ViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { viewModelsConfig } from 'mobx-view-model';
import type { Component, PropType, VNodeChild } from 'vue';
import { defineComponent, getCurrentInstance, h } from 'vue';
import type {
  AnyObject,
  Class,
  EmptyObject,
  IsPartial,
  Maybe,
} from 'yummies/types';
import { useComponentProps } from './component-adapter.js';
import { getModelRevision } from './model-revision.js';
import { observer } from './observer.js';
import { provideRenderDependency } from './render-dependencies.js';
import { useRenderAllowed } from './render-state.js';
import type { UseCreateViewModelConfig, VRenderFn } from './types.js';
import { provideActiveViewModel } from './use-active-view-model.js';
import { useCreateViewModel } from './use-create-view-model.js';
import { useViewModelsStore } from './use-view-model-store.js';

export type ViewModelProps<VM> = { model: VM };

export type ViewModelPropsChargedProps<
  TComponentOriginProps extends AnyObject,
  TViewModel,
> = TComponentOriginProps & ViewModelProps<TViewModel>;

type VMInputPayloadPropObj<VM> = VM extends ViewModel<infer TPayload, any>
  ? TPayload extends EmptyObject
    ? {}
    : IsPartial<TPayload> extends true
      ? {
          payload?: TPayload;
        }
      : {
          payload: TPayload;
        }
  : VM extends ViewModelSimple<infer TPayload>
    ? TPayload extends EmptyObject
      ? {}
      : IsPartial<TPayload> extends true
        ? {
            payload?: TPayload;
          }
        : {
            payload: TPayload;
          }
    : {};

export type WithViewModelVueHook = (
  allProps: AnyObject,
  ctx: AnyObject,
  viewModels: Maybe<ViewModelStore>,
) => void;

export interface ViewModelHocConfig<VM extends AnyViewModel>
  extends Omit<UseCreateViewModelConfig<VM>, 'component' | 'componentProps'> {
  /**
   * Component to render while the view model is mounting
   */
  fallback?: Component;

  /**
   * Extra Vue setup in the resulting component
   */
  vueHook?: WithViewModelVueHook;

  /**
   * Function that should return the payload for the VM.
   * Default: `(props) => props.payload`
   */
  getPayload?: (allProps: any) => any;

  /**
   * Additional component anchors for the same VM instance.
   * `useViewModel(AnchorComponent)` returns this VM when connected component is mounted.
   */
  anchors?: Component<any>[];
}

export interface ViewModelSimpleHocConfig<_VM> {
  fallback?: Component;
  vueHook?: WithViewModelVueHook;
  getPayload?: (allProps: any) => any;
  anchors?: Component<any>[];
}

export type AllViewModelPropsKeys = keyof Required<ViewModelProps<any>>;

export type VMComponentProps<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
> = Omit<TComponentOriginProps, AllViewModelPropsKeys> &
  VMInputPayloadPropObj<TViewModel>;

export interface VMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
> extends ViewModelComponentRef<
    TViewModel extends AnyViewModel | AnyViewModelSimple
      ? TViewModel
      : AnyViewModel | AnyViewModelSimple
  > {
  (props: VMComponentProps<TViewModel, TComponentOriginProps>): VNodeChild;

  /**
   * Registers an anchor component for the same VM instance.
   */
  connect(
    anchor: Component<any>,
  ): VMComponent<TViewModel, TComponentOriginProps>;
}

/**
 * Runtime props for a view component that receives `model` from {@link withViewModel}.
 * Use this so `setup(props)` infers `props.model` as `VM` without casting.
 *
 * @example
 * ```ts
 * defineComponent({
 *   props: viewModelProps<YourVM>(),
 *   setup(props) {
 *     return () => h('div', props.model.id);
 *   },
 * });
 * ```
 */
export function viewModelProps<
  VM extends AnyViewModel | AnyViewModelSimple,
>(): {
  model: {
    type: PropType<VM>;
    required: true;
  };
} {
  return {
    model: {
      type: Object as PropType<VM>,
      required: true,
    },
  };
}

/** Connects a render function to a model, using the same call shape as Solid. */
export function withViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
>(
  VM: Class<TViewModel>,
  renderFn: VRenderFn<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel>
  >,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;
export function withViewModel<
  TViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
>(
  VM: Class<TViewModel>,
  renderFn: VRenderFn<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel>
  >,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;
/** Also accepts native Vue components and compiled SFCs. */
export function withViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
>(
  VM: Class<TViewModel>,
  component: Component,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;
export function withViewModel<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
>(
  VM: Class<TViewModel>,
  component: Component,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

export function withViewModel(
  VM: Class<any>,
  rawView: Component = () => null,
  rawConfig?: ViewModelHocConfig<any> & ViewModelSimpleHocConfig<any>,
): any {
  // Each wrapper owns its anchors; connect() never mutates caller configuration.
  const config = { ...rawConfig, anchors: [...(rawConfig?.anchors ?? [])] };
  const getPayload = config.getPayload ?? viewModelsConfig.getPayload;
  const Fallback =
    config.fallback ??
    config.vmConfig?.fallbackComponent ??
    viewModelsConfig.fallbackComponent;
  const processRender =
    config.vmConfig?.processRender ?? viewModelsConfig.processRender;
  const SourceView = observer(rawView);
  // processRender calls this inside the processed view's render context.
  // That context carries Vue slots, including scoped slots.
  const renderFn = (props: AnyObject) =>
    h(SourceView, props, getCurrentInstance()?.slots);
  const processed = processRender?.(
    renderFn as VRenderFn<AnyObject>,
    VM,
    config,
  );
  const View = processed ? observer(processed as Component) : SourceView;

  const RawComponent = defineComponent({
    name: `ConnectedViewModel(${VM.name})`,
    inheritAttrs: false,
    props: {
      payload: { type: null as unknown as PropType<any>, required: false },
    },
    setup(props, ctx) {
      const allProps = useComponentProps(props);
      const model = useCreateViewModel(
        VM,
        () => getPayload(allProps),
        config,
        allProps,
      ) as AnyViewModel | AnyViewModelSimple;
      provideActiveViewModel(model);
      const revision = getModelRevision(model);
      provideRenderDependency(() => revision.value);
      const store = useViewModelsStore();
      (config.vueHook ?? viewModelsConfig.reactHook)?.(
        allProps,
        config.ctx ?? {},
        store,
      );
      const isRenderAllowed = useRenderAllowed(model);
      return () => {
        if (!isRenderAllowed())
          return Fallback ? h(Fallback as Component) : null;
        const { payload: _payload, ...rest } = allProps;
        return h(View, { ...rest, model }, ctx.slots);
      };
    },
  });
  const Connected = observer(RawComponent) as unknown as VMComponent<any>;
  config.anchors.push(Connected as Component);
  Connected.connect = (anchor: Component) => {
    if (!config.anchors.includes(anchor)) config.anchors.push(anchor);
    return Connected;
  };
  return Connected;
}
