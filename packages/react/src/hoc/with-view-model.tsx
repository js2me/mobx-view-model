import { reaction } from 'mobx';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelComponentRef,
  ViewModelSimple,
  ViewModelStore
} from 'mobx-view-model';
import { _internals, isViewModel, viewModelsConfig } from 'mobx-view-model';
import { observer } from 'mobx-react-lite';
import {
  createElement,
  forwardRef,
  useContext,
  useRef,
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
import { ActiveViewModelProvider } from '../components/index.js';
import { ViewModelsContext } from '../contexts/index.js';
import {
  type UseCreateViewModelConfig,
  useCreateViewModel,
} from '../hooks/index.js';
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

type VMHocFullConfig = ViewModelSimpleHocConfig<any> & ViewModelHocConfig<any> & {
  component: VMComponent<any>;
}

const ReactMemoSymbol = Symbol.for('react.memo');

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
  rawConfig?: ViewModelSimpleHocConfig<any> & ViewModelHocConfig<any>,
): any {
  const config = (rawConfig ?? {}) as VMHocFullConfig;
  const anchors = (config.anchors ??= []);
  // Defensive fallback: a duplicated/older mobx-view-model copy can poison the
  // shared viewModelsConfig singleton (Symbol.for) and leave getPayload undefined.
  const getPayload: Defined<VMHocFullConfig['getPayload']> = config.getPayload ?? viewModelsConfig.getPayload;
  console.log('--- ENTER withViewModel', 'getPayload', getPayload);
  const forwardRefMode = !!config.forwardRef;
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
    if (process.env.NODE_ENV !== 'production') {
      const nestedObserverError = 
        '[mobx-view-model-react] You are trying to wrap a View component in `observer` or `React.memo` inside `withViewModel`. `withViewModel` already applies `observer` automatically, so do not wrap the View component manually.\n' +
  'More info: https://js2me.github.io/mobx-view-model/errors/4';
      throw new Error(`Error #4: ${nestedObserverError}`);
    }
    throw new Error('Error #4: https://js2me.github.io/mobx-view-model/errors/4');
  }

  // Single observer layer — tracks model observables in the view.
  const View = observer(renderFn as RFunctionComponent<any>);

  if (process.env.NODE_ENV !== 'production') {
    View.displayName = `View(${VM.name})`;
  }

  // Plain shell (no observer): create VM, gate on isMounted, render View / Fallback.
  const dbgW = process.env.NODE_ENV !== 'production'
    ? (...args: any[]) => console.log('[withVM]', ...args)
    : () => {};

  const Wrapper = (allProps: any, ref?: any): RReactNode => {
    const viewModels = useContext(ViewModelsContext);
    const payload = getPayload(allProps);

    dbgW('--- ENTER Wrapper', VM.name, 'propsId=', allProps?.id);

    const model = useCreateViewModel(
      VM,
      payload,
      config,
      allProps,
    ) as AnyViewModel | AnyViewModelSimple;

    dbgW('Wrapper GOT model', VM.name, 'modelId=', model.id, 'lifecycleState=', (model as any).lifecycleState, 'isMounted=', (model as any).isMounted, 'isViewModel=', isViewModel(model));

    (config.reactHook ?? viewModelsConfig.reactHook)?.(
      allProps,
      config.ctx ?? {},
      viewModels,
      ref,
    );

    // Stable props for Provider (`value`) + useSyncExternalStore.
    // @ts-expect-error it's ok
    const cacheRef = useRef<{
      value: typeof model;
      subscribe: (onStoreChange: () => void) => () => void;
      getSnapshot: () => boolean;
    }>();

    if (cacheRef.current) {
      cacheRef.current.value = model;
    } else {
      dbgW('INIT cacheRef', VM.name, 'modelId=', model.id, 'isMounted=', (model as any).isMounted);
      cacheRef.current = {
        value: model,
        subscribe: (onStoreChange) =>
          reaction(
            () => {
              const current = cacheRef.current.value;
              const ready = !isViewModel(current) || current.isMounted;
              dbgW('subscribe reaction', VM.name, 'currentId=', current?.id, 'isMounted=', (current as any)?.isMounted, 'ready=', ready);
              return ready;
            },
            (ready) => {
              dbgW('subscribe reaction FIRED', VM.name, 'ready=', ready);
              onStoreChange();
            },
          ),
        getSnapshot: () => {
          const ready = (cacheRef.current.value as AnyViewModel).isMounted !== false;
          dbgW('getSnapshot', VM.name, 'modelId=', cacheRef.current.value?.id, 'isMounted=', (cacheRef.current.value as AnyViewModel)?.isMounted, 'ready=', ready);
          return ready;
        },
      };
    }

    const getServerSnapshot =
      typeof window !== 'undefined' && viewModelsConfig.mode === 'ssr'
        ? () => {
            dbgW('getServerSnapshot (SSR=true)', VM.name, 'returning true');
            return true;
          }
        : cacheRef.current.getSnapshot;

    dbgW('useSyncExternalStore', VM.name, 'isSSR=', viewModelsConfig.mode === 'ssr', 'isClient=', typeof window !== 'undefined');

    const isReadyToRender = useSyncExternalStore(
      cacheRef.current.subscribe,
      cacheRef.current.getSnapshot,
      getServerSnapshot,
    );

    dbgW('isReadyToRender', VM.name, 'isReady=', isReadyToRender, 'modelId=', model.id, 'isMounted=', (model as any).isMounted);

    let child: RReactNode = null;

    if (isReadyToRender) {
      dbgW('RENDER View', VM.name, 'modelId=', model.id);
      // One shallow copy only on the ready path (fallback skips this alloc).
      const viewProps = { ...allProps, model };
      delete viewProps.payload;
      if (forwardRefMode) {
        viewProps.ref = ref;
      }
      child = createElement(View, viewProps);
    } else if (Fallback) {
      dbgW('RENDER Fallback', VM.name);
      child = createElement(Fallback);
    } else {
      dbgW('RENDER null', VM.name);
    }

    return createElement(ActiveViewModelProvider, cacheRef.current, child);
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
