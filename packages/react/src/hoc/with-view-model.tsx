import { reaction } from 'mobx';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelComponentRef,
  ViewModelSimple,
  ViewModelStore
} from 'mobx-view-model';
import { _internals, isViewModel, isViewModelClass, viewModelsConfig } from 'mobx-view-model';
import { observer } from 'mobx-react-lite';
import {
  createContext,
  createElement,
  forwardRef,
  useContext,
  useSyncExternalStore,
} from 'react';
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
import { viewModelError } from '../lib/view-model-error.js';
import { ActiveViewModelProvider } from '../components/index.js';
import { ViewModelsContext } from '../contexts/index.js';
import {
  type UseCreateViewModelConfig,
  useViewModelState,
  viewModelPayloadVersions,
} from '../hooks/use-create-view-model.js';
import { readySnapshot, subscribeNoop } from '../lib/ready-snapshot.js';
import { reactUse } from '../lib/react-use.js';
import {
  RComponentClass,
  RComponentType,
  RForwardedRef,
  RFunctionComponent,
  RLegacyRef,
  RRenderFn,
  RReactNode,
} from '../lib/react-types.js';

export type FixedComponentType<P extends AnyObject = {}> =
  /**
   * Fixes typings loss with use `withViewModel` with inline function component
   */
  ((props: P) => RReactNode) | RComponentClass<P>;

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
 * Use second generic type add typings for `ref` prop
 */
export type ViewModelProps<
  VM,
  TForwardedRef = unknown,
> = IsAny<TForwardedRef> extends true
  ? { model: VM; ref?: RForwardedRef<TForwardedRef> }
  : IsUnknown<TForwardedRef> extends true
    ? { model: VM }
    : { model: VM; ref?: RForwardedRef<TForwardedRef> };

export type ViewModelPropsChargedProps<
  TComponentOriginProps extends AnyObject,
  TViewModel,
  TForwardedRef = unknown,
> = HasKey<TComponentOriginProps, 'ref'> extends true
  ? Omit<TComponentOriginProps, 'ref'> &
      ViewModelProps<TViewModel, ExtractReactRef<TComponentOriginProps['ref']>>
  : TComponentOriginProps &
      ViewModelProps<
        TViewModel,
        IsUnknown<TForwardedRef> extends true ? any : TForwardedRef
      >;

type VMInputPayloadProp<TPayload> = TPayload extends EmptyObject
    ? {}
    : IsPartial<TPayload> extends true
      ? {
          payload?: TPayload;
        }
      : {
          payload: TPayload;
        };

type VMInputPayloadPropObj<VM> = VM extends ViewModel<infer TPayload, any>
  ? VMInputPayloadProp<TPayload>
  : VM extends ViewModelSimple<infer TPayload>
    ? VMInputPayloadProp<TPayload>
    : {};

export type WithViewModelReactHook = (
  allProps: AnyObject,
  ctx: AnyObject,
  viewModels: Maybe<ViewModelStore>,
  ref?: any,
) => void;

interface SharedViewModelHocConfig {
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

export interface ViewModelHocConfig<VM extends AnyViewModel>
  extends Omit<UseCreateViewModelConfig<VM>, 'component' | 'componentProps' | 'anchors'>, SharedViewModelHocConfig {}

export interface ViewModelSimpleHocConfig<_VM> extends SharedViewModelHocConfig {}

export type AllViewModelPropsKeys = keyof Required<ViewModelProps<any, any>>;

export type VMComponentProps<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = unknown,
> = Omit<TComponentOriginProps, AllViewModelPropsKeys> &
  VMInputPayloadPropObj<TViewModel> &
  (HasKey<TComponentOriginProps, 'ref'> extends true
    ? Required<TComponentOriginProps>['ref'] extends RForwardedRef<infer R>
      ? { ref?: RLegacyRef<R> }
      : Required<TComponentOriginProps>['ref'] extends RLegacyRef<infer R>
        ? { ref?: RLegacyRef<R> }
        : { ref?: RLegacyRef<ExtractReactRef<TComponentOriginProps['ref']>> }
    : IsUnknown<TForwardedRef> extends true
      ? {}
      : { ref?: RLegacyRef<TForwardedRef> });

export interface VMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = unknown,
> extends ViewModelComponentRef<
  TViewModel extends AnyViewModel | AnyViewModelSimple
    ? TViewModel
    : AnyViewModel | AnyViewModelSimple
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

let simplePayloadContext: React.Context<number> | undefined;
const ReactMemoSymbol = Symbol.for('react.memo');
const alwaysReady = { subscribe: subscribeNoop, getSnapshot: readySnapshot };

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
  VM: Class<TViewModel>,
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
  VM: Class<TViewModel>,
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
  rawConfig?: ViewModelHocConfig<any>,
): any {
  const config = rawConfig ?? {};
  const anchors = (config.anchors ??= []);
  const getPayload = config.getPayload ?? viewModelsConfig.getPayload;
  const forwardRefMode = config.forwardRef;
  const Fallback = (config.fallback ??
    config.vmConfig?.fallbackComponent ??
    viewModelsConfig.fallbackComponent) as RComponentType | undefined;

  const processViewComponent =
    config.vmConfig?.processRender ?? viewModelsConfig.processRender;

  const renderFn =
    (processViewComponent?.(rawRenderFn, VM, config) as
      | RRenderFn<AnyObject>
      | undefined) ??
    rawRenderFn ??
    _internals.noop;

  if ((renderFn as any)?.$$typeof === ReactMemoSymbol) {
    throw viewModelError(4, process.env.NODE_ENV !== 'production'
      ? '[mobx-view-model-react] You are trying to wrap a View component in `observer` or `React.memo` inside `withViewModel`. `withViewModel` already applies `observer` automatically, so do not wrap the View component manually.'
      : undefined);
  }

  const PayloadVersionContext = isViewModelClass(VM)
    ? null
    : (simplePayloadContext ??= createContext(0));
  const View = observer((PayloadVersionContext
    ? (props: any) => {
        // Subscribe to the revision: plain ViewModelSimple fields do not notify
        // observer, and unchanged props alone would not rerender this view.
        useContext(PayloadVersionContext);
        return renderFn(props);
      }
    : renderFn) as RFunctionComponent<any>);

  if (process.env.NODE_ENV !== 'production') {
    View.displayName = `View(${VM.name})`;
  }

  const Wrapper = (allProps: any, ref?: any): RReactNode => {
    const viewModels = useContext(ViewModelsContext);
    const payload = getPayload(allProps);

    const state = useViewModelState(viewModels, VM, payload, config, allProps);
    const model = state.vm;

    (config.reactHook ?? viewModelsConfig.reactHook)?.(
      allProps,
      config.ctx ?? {},
      viewModels,
      ref,
    );

    const { subscribe, getSnapshot } = state.readiness ??= isViewModel(model)
      ? {
        subscribe: notify => reaction(() => model.isMounted, notify),
        // Suspense can hide and retry this fiber after layout-effect cleanup.
        getSnapshot: () => model.isMounted !== false ||
          model.vm.state === 'unmounting' || model.vm.state === 'unmounted',
      }
      : alwaysReady;
    const isReadyToRender = useSyncExternalStore(
      subscribe,
      getSnapshot,
      typeof window !== 'undefined' &&
      viewModelsConfig.mode === 'ssr' &&
      typeof reactUse === 'function'
        ? readySnapshot
        : getSnapshot,
    );

    let child: RReactNode = null;

    if (isReadyToRender) {
      const viewProps = { ...allProps, model };
      delete viewProps.payload;
      if (forwardRefMode) {
        viewProps.ref = ref;
      }
      child = createElement(View, viewProps);
      if (PayloadVersionContext) {
        // The revision is internal; never add it to the user's view props.
        child = createElement(
          PayloadVersionContext.Provider,
          { value: viewModelPayloadVersions.get(model) ?? 0 },
          child,
        );
      }
    } else if (Fallback) {
      child = createElement(Fallback);
    }

    return createElement(ActiveViewModelProvider, { value: model }, child);
  };

  if (process.env.NODE_ENV !== 'production') {
    (Wrapper as RComponentType).displayName = `withViewModel(${VM.name})`;
  }

  const ConnectVMComponent = (
    forwardRefMode ? forwardRef(Wrapper) : Wrapper
  ) as VMComponent<typeof VM>;

  anchors.push(ConnectVMComponent);

  /**
   * Registers an anchor component for the same VM instance.
   * Adds the anchor to config.anchors — useViewModel(anchor) will return this VM when mounted.
   */
  ConnectVMComponent.connect = (anchor: RComponentType) => {
    if (!anchors.includes(anchor)) {
      anchors.push(anchor);
    }
    return ConnectVMComponent;
  };

  return ConnectVMComponent;
}
