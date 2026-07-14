import type {
  AnyViewModel,
  AnyViewModelSimple, RRenderFn,
  ViewModel,
  ViewModelSimple,
  ViewModelStore
} from 'mobx-view-model';
import { viewModelsConfig } from 'mobx-view-model';
import { forwardRef } from 'react';
import type {
  AnyObject,
  Class,
  Defined, EmptyObject,
  HasKey,
  IsAny,
  IsPartial,
  IsUnknown,
  Maybe
} from 'yummies/types';
import { ActiveViewModelProvider } from '../components/index.js';
import {
  type UseCreateViewModelConfig,
  useCreateViewModel,
} from '../hooks/index.js';
import {
  RComponentClass,
  RComponentType,
  RForwardedRef,
  RLegacyRef,
  RReactNode,
} from '../lib/react-types.js';
import { observer } from 'mobx-react-lite';
import { noop } from '../lib/noop.js';

export type FixedComponentType<P extends AnyObject = {}> =
  /**
   * Fixes typings loss with use `withViewModel` with inline function component
   */
  ((props: P) => RReactNode) | RComponentClass<P>;

declare const process: { env: { NODE_ENV?: string } };

export type ExtractReactRef<T> = Defined<T> extends RForwardedRef<
  infer TForwardedRef
>
  ? TForwardedRef
  : Defined<T> extends RLegacyRef<infer TRef>
    ? TRef
    : T;

/**
 * This type is needed to declare prop types for your View component wrapped into `withViewModel` HOC
 *
 * Use second generic type add typings for `forwardedRef` prop
 */
export type ViewModelProps<
  VM,
  TForwardedRef = unknown,
> = IsAny<TForwardedRef> extends true
  ? { model: VM; forwardedRef?: RForwardedRef<TForwardedRef> }
  : IsUnknown<TForwardedRef> extends true
    ? { model: VM }
    : { model: VM; forwardedRef?: RForwardedRef<TForwardedRef> };

export type ViewModelPropsChargedProps<
  TComponentOriginProps extends AnyObject,
  TViewModel,
  TForwardedRef = unknown,
> = HasKey<TComponentOriginProps, 'ref'> extends true
  ? Omit<TComponentOriginProps, 'ref'> &
      ViewModelProps<TViewModel, ExtractReactRef<TComponentOriginProps['ref']>>
  : HasKey<TComponentOriginProps, 'forwardedRef'> extends true
    ? TComponentOriginProps
    : TComponentOriginProps &
        ViewModelProps<
          TViewModel,
          IsUnknown<TForwardedRef> extends true ? any : TForwardedRef
        >;

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

export type WithViewModelReactHook = (
  allProps: AnyObject,
  ctx: AnyObject,
  viewModels: Maybe<ViewModelStore>,
  ref?: any,
) => void;

export interface ViewModelHocConfig<VM extends AnyViewModel>
  extends Omit<UseCreateViewModelConfig<VM>, 'component' | 'componentProps'> {
  /**
   * Component to render if the view model initialization takes too long
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#fallback)
   */
  fallback?: RComponentType;

  /**
   * Function to invoke additional React hooks in the resulting component
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#reacthook)
   */
  reactHook?: WithViewModelReactHook;

  /**
   * Function that should return the payload for the VM
   * by default, it is - (props) => props.payload
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#getpayload)
   */
  getPayload?: (allProps: any) => any;

  /**
   * Forwards ref using `RforwardRef` but pass it to props as prop `ref`
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#forwardref)
   */
  forwardRef?: boolean;

  /**
   * Additional component anchors for the same VM instance.
   * useViewModel(AnchorComponent) will return this VM when the connected component is mounted.
   */
  anchors?: RComponentType[];
}

export interface ViewModelSimpleHocConfig<_VM> {
  /**
   * Component to render if the view model initialization takes too long
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#fallback)
   */
  fallback?: RComponentType;

  /**
   * Function to invoke additional React hooks in the resulting component
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#reacthook)
   */
  reactHook?: WithViewModelReactHook;

  /**
   * Function that should return the payload for the VM
   * by default, it is - (props) => props.payload
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#getpayload)
   */
  getPayload?: (allProps: any) => any;

  /**
   * Forwards ref using `RforwardRef` but pass it to props as prop `ref`
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#forwardref)
   */
  forwardRef?: boolean;

  /**
   * Additional component anchors for the same VM instance.
   * useViewModel(AnchorComponent) will return this VM when the connected component is mounted.
   */
  anchors?: RComponentType[];
}

export type AllViewModelPropsKeys = keyof Required<ViewModelProps<any, any>>;

export type VMComponentProps<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = unknown,
> = Omit<TComponentOriginProps, AllViewModelPropsKeys> &
  VMInputPayloadPropObj<TViewModel> &
  (HasKey<TComponentOriginProps, 'ref'> extends true
    ? {}
    : HasKey<TComponentOriginProps, 'forwardedRef'> extends true
      ? Required<TComponentOriginProps>['forwardedRef'] extends RLegacyRef<any>
        ? {
            ref?: TComponentOriginProps['forwardedRef'];
          }
        : Pick<TComponentOriginProps, 'forwardedRef'>
      : IsUnknown<TForwardedRef> extends true
        ? {}
        : { ref?: RLegacyRef<TForwardedRef> });

export interface VMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = unknown,
> {
  (
    props: VMComponentProps<TViewModel, TComponentOriginProps, TForwardedRef>,
  ): RReactNode;

  /**
   * Registers an anchor component for the same VM instance.
   * `useViewModel(anchor)` will return this VM when the connected component is mounted.
   * Anchors are stored in config.anchors and passed to the store's link() during processCreateConfig.
   * @param anchor - React component to use as lookup key for useViewModel
   */
  connect(
    anchor: RComponentType<any>,
  ): VMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;
}

type VMHocFullConfig = ViewModelSimpleHocConfig<any> & ViewModelHocConfig<any> & {
  component: VMComponent<any>;
}

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = unknown,
>(
  model: Class<TViewModel>,
  renderFn: RRenderFn<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel, TForwardedRef>
  >,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;


/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<
  TViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
  TForwardedRef = unknown,
>(
  model: Class<TViewModel>,
  renderFn: RRenderFn<ViewModelPropsChargedProps<TComponentOriginProps, TViewModel, TForwardedRef>>,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;

/**
 * Creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel(
  VM: Class<any>,
  rawRenderFn?: RRenderFn<AnyObject>,
  rawConfig?: ViewModelSimpleHocConfig<any> & ViewModelHocConfig<any>,
): any {
  const config = (rawConfig??{}) as VMHocFullConfig;
  const anchors = config.anchors ??= [];

  const processViewComponent =
    config.vmConfig?.processRender ??
    viewModelsConfig.processRender;

  let renderFn =
    processViewComponent?.(rawRenderFn, VM, config) ?? rawRenderFn ?? noop;

  const getPayload = config.getPayload;
  const Fallback = config.fallback ?? config.vmConfig?.fallbackComponent ?? noop

  // original component where happens all rendering and processing
  const Component = (allProps: any, ref: any) => {
    const { payload: rawPayload, ...propsToForward } = allProps;
    const payload = getPayload?.(allProps) ?? rawPayload ?? {};

    if (config.forwardRef && !('forwardedRef' in propsToForward)) {
      propsToForward.forwardedRef = ref;
    }

    const model = useCreateViewModel(VM, payload, config, propsToForward) as AnyViewModel | AnyViewModelSimple;

    propsToForward.model = model;

    const node = renderFn(propsToForward);

    const isReadyToRender = !('isMounted' in model) || model.isMounted
    
    return (
      <ActiveViewModelProvider value={model}>
        {isReadyToRender ? node : <Fallback />}
      </ActiveViewModelProvider>
    );
  };

  let VMComponent = observer(Component as any) as VMComponent<typeof VM>;

  if (config.forwardRef) {
    VMComponent = forwardRef(VMComponent) as any;
  }

  if (process.env.NODE_ENV !== 'production') {
    (VMComponent as RComponentType).displayName = `${VM.name}`;
  }

  anchors.push(VMComponent);

  /**
   * Registers an anchor component for the same VM instance.
   * Adds the anchor to config.anchors — useViewModel(anchor) will return this VM when mounted.
   */
  VMComponent.connect = (anchor: RComponentType) => {
    if (!anchors.includes(anchor)) {
      anchors.push(anchor);
    }
    return VMComponent;
  };

  return VMComponent;
}
