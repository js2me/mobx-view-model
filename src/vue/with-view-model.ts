import type { Component, PropType } from 'vue';
import { computed, defineComponent, h, useAttrs } from 'vue';
import type { AnyObject, Class, EmptyObject, IsPartial } from 'yummies/types';
import { viewModelsConfig } from '../config/index.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelSimple,
} from '../view-model/index.js';
import { observer } from './observer.js';
import type { UseCreateViewModelConfig } from './types.js';
import { provideActiveViewModel } from './use-active-view-model.js';
import { useCreateViewModel } from './use-create-view-model.js';
import { useViewModelsStore } from './use-view-model-store.js';

export type ViewModelProps<VM> = { model: VM };

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

export interface ViewModelHocConfig<VM extends AnyViewModel>
  extends Omit<UseCreateViewModelConfig<VM>, 'component' | 'anchors'> {
  fallback?: Component;
  getPayload?: (allProps: any) => any;
  anchors?: Component[];
  component?: Component;
}

export interface ViewModelSimpleHocConfig<_VM> {
  fallback?: Component;
  getPayload?: (allProps: any) => any;
  anchors?: Component[];
}

export type VMComponentProps<
  TViewModel,
  TComponentOriginProps extends AnyObject,
> = Omit<TComponentOriginProps, keyof ViewModelProps<any>> &
  VMInputPayloadPropObj<TViewModel>;

export interface VMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
> {
  (props: VMComponentProps<TViewModel, TComponentOriginProps>): any;
  connect(anchor: Component): VMComponent<TViewModel, TComponentOriginProps>;
}

export function withViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
>(
  model: Class<TViewModel>,
  component: Component,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

export function withViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
>(
  model: Class<TViewModel>,
  config?: ViewModelHocConfig<TViewModel>,
): (component: Component) => VMComponent<TViewModel, TComponentOriginProps>;

export function withViewModel<
  TViewModel extends AnyViewModelSimple,
  TComponentOriginProps extends AnyObject = AnyObject,
>(
  model: Class<TViewModel>,
  component: Component,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

export function withViewModel<
  TViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
>(
  model: Class<TViewModel>,
  component: Component,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

export function withViewModel(
  VM: Class<any>,
  configOrComponent?: any,
  configOrNothing?: any,
): any {
  if (typeof configOrComponent === 'object' && !configOrComponent?.setup) {
    const config = configOrComponent ?? {};
    const finalConfig = {
      ...config,
      ctx: {
        VM,
        generateId: config.generateId,
        ...config.ctx,
      },
    };
    return (Component: Component) =>
      withViewModelWrapper(VM, finalConfig, Component);
  }

  const config = configOrNothing ?? {};
  return withViewModelWrapper(
    VM,
    {
      ...config,
      ctx: {
        VM,
        generateId: config.generateId,
        ...config.ctx,
      },
    },
    configOrComponent,
  );
}

const withViewModelWrapper = (
  VM: Class<any>,
  config: ViewModelHocConfig<any>,
  OriginalComponent?: Component,
) => {
  const wrapViewsInObserver =
    config.vmConfig?.wrapViewsInObserver ??
    viewModelsConfig.wrapViewsInObserver;

  let Component = OriginalComponent;
  if (wrapViewsInObserver && Component) {
    Component = observer(Component);
  }

  const FallbackComponent =
    config.fallback ?? viewModelsConfig.fallbackComponent;
  const getPayload = config.getPayload ?? ((props: any) => props.payload);

  const RawComponent = defineComponent({
    name: `ConnectedViewModel(${VM.name}->Component)`,
    props: {
      payload: {
        type: null as unknown as PropType<any>,
        required: false,
      },
    },
    setup(props, ctx) {
      const attrs = useAttrs();
      const allProps = computed(() => ({
        ...(attrs as any),
        ...(props as any),
      }));
      const payloadRef = computed(() => getPayload(allProps.value));
      const componentProps = computed(() => {
        const { payload: _payload, ...rest } = allProps.value as any;
        return rest;
      });

      const model = useCreateViewModel(VM, payloadRef, {
        ...config,
        component: ConnectedViewModel as any,
        anchors: config.anchors as any,
        props: componentProps.value,
      }) as unknown as AnyViewModel | AnyViewModelSimple;

      const viewModels = useViewModelsStore();
      provideActiveViewModel(model);

      return () => {
        const isRenderAllowedByStore =
          !viewModels || viewModels.isAbleToRenderView(model.id);
        const isRenderAllowed =
          isRenderAllowedByStore && (model as AnyViewModel).isMounted !== false;

        if (isRenderAllowed) {
          return Component
            ? h(Component as any, { ...componentProps.value, model }, ctx.slots)
            : ctx.slots.default?.({ model });
        }

        return FallbackComponent
          ? h(FallbackComponent as any, {
              ...allProps.value,
              payload: payloadRef.value,
            })
          : null;
      };
    },
  });

  const ConnectedViewModel = observer(RawComponent);

  config.component = ConnectedViewModel as any;
  config.anchors ??= [];

  const anchors = config.anchors;

  const ConnectedWithConnect =
    ConnectedViewModel as typeof ConnectedViewModel & {
      connect: (anchor: Component) => typeof ConnectedWithConnect;
    };

  ConnectedWithConnect.connect = (anchor: Component) => {
    if (!anchors.includes(anchor)) {
      anchors.push(anchor);
    }
    return ConnectedWithConnect;
  };

  return ConnectedWithConnect;
};
