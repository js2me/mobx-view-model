import { observer } from 'mobx-react-lite';
import { forwardRef, useContext } from 'react';
import type {
  AnyObject,
  Class,
  EmptyObject,
  IsPartial,
  Maybe,
} from 'yummies/utils/types';
import { viewModelsConfig } from '../config/index.js';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import {
  type UseCreateViewModelConfig,
  useCreateViewModel,
} from '../hooks/index.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelSimple,
  ViewModelStore,
} from '../view-model/index.js';

type FixedComponentType<P extends AnyObject = {}> =
  /**
   * Fixes typings loss with use `withViewModel` with inline function component
   */
  ((props: P) => React.ReactNode) | React.ComponentClass<P>;

declare const process: { env: { NODE_ENV?: string } };

/**
 * This type is needed to declare prop types for your View component wrapped into `withViewModel` HOC
 *
 * Use second generic type add typings for `forwardedRef` prop
 */
export type ViewModelProps<
  VM,
  TForwardedRef = void,
> = TForwardedRef extends void
  ? {
      model: VM;
      forwardedRef?: React.ForwardedRef<
        TForwardedRef extends void ? any : TForwardedRef
      >;
    }
  : {
      model: VM;
      forwardedRef?: React.ForwardedRef<
        TForwardedRef extends void ? any : TForwardedRef
      >;
    };

type ViewModelPropsChargedProps<
  TComponentOriginProps extends AnyObject,
  TViewModel,
  TForwardedRef = void,
> = HasSpecificKey<TComponentOriginProps, 'ref'> extends true
  ? Omit<TComponentOriginProps, 'ref'> &
      ViewModelProps<TViewModel, TComponentOriginProps['ref']>
  : HasSpecificKey<TComponentOriginProps, 'forwardedRef'> extends true
    ? TComponentOriginProps
    : TComponentOriginProps & ViewModelProps<TViewModel, TForwardedRef>;

type VMInputPayloadPropObj<VM> = VM extends ViewModel<infer TPayload, any>
  ? TPayload extends EmptyObject
    ? AnyObject
    : IsPartial<TPayload> extends true
      ? {
          payload?: TPayload;
        }
      : {
          payload: TPayload;
        }
  : VM extends ViewModelSimple<infer TPayload>
    ? TPayload extends EmptyObject
      ? AnyObject
      : IsPartial<TPayload> extends true
        ? {
            payload?: TPayload;
          }
        : {
            payload: TPayload;
          }
    : AnyObject;

/**
 * @deprecated use `VMComponentProps`
 */
export type ViewModelInputProps<
  VM,
  TForwardedRef = void,
> = VMInputPayloadPropObj<VM> & {
  ref?: React.LegacyRef<TForwardedRef>;
};

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
  fallback?: React.ComponentType;

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
   * Forwards ref using `React.forwardRef` but pass it to props as prop `ref`
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#forwardref)
   */
  forwardRef?: boolean;
}

export interface ViewModelSimpleHocConfig<_VM> {
  /**
   * Component to render if the view model initialization takes too long
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#fallback)
   */
  fallback?: React.ComponentType;

  /**
   * Function to invoke additional React hooks in the resulting component
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#reacthook)
   */
  reactHook?: WithViewModelReactHook;

  /**
   * Function that should return the payload for the VM
   * by default, it is - (props) => props.payload
   */
  getPayload?: (allProps: any) => any;

  /**
   * Forwards ref using `React.forwardRef` but pass it to props as prop `ref`
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html#forwardref)
   */
  forwardRef?: boolean;
}

type HasSpecificKey<T, TKey extends string> = string extends keyof T
  ? false
  : TKey extends keyof T
    ? true
    : false;

export type VMComponentProps<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = void,
> = Omit<TComponentOriginProps, keyof ViewModelProps<TViewModel, HTMLElement>> &
  VMInputPayloadPropObj<TViewModel> &
  (TForwardedRef extends void
    ? HasSpecificKey<TComponentOriginProps, 'forwardedRef'> extends true
      ? Pick<TComponentOriginProps, 'forwardedRef'>
      : HasSpecificKey<TComponentOriginProps, 'ref'> extends true
        ? { ref?: TComponentOriginProps['ref'] }
        : {}
    : { ref?: React.ForwardedRef<TForwardedRef> });

export type VMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = void,
> = (
  props: VMComponentProps<TViewModel, TComponentOriginProps, TForwardedRef>,
) => React.ReactNode;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = void,
>(
  model: Class<TViewModel>,
  component: React.ComponentType<
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
  TViewModel extends AnyViewModel,
  TForwardedRef = void,
>(
  model: Class<TViewModel>,
  config?: ViewModelHocConfig<TViewModel>,
): <TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>>(
  Component?: React.ComponentType<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel, TForwardedRef>
  >,
) => VMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<TViewModel, TForwardedRef = void>(
  model: Class<TViewModel>,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): <TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>>(
  Component?: FixedComponentType<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel, TForwardedRef>
  >,
) => VMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<
  TViewModel extends AnyViewModelSimple,
  TComponentOriginProps extends AnyObject = AnyObject,
  TForwardedRef = void,
>(
  model: Class<TViewModel>,
  component: FixedComponentType<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel, TForwardedRef>
  >,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<
  TViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
  TForwardedRef = void,
>(
  model: Class<TViewModel>,
  component: FixedComponentType<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel, TForwardedRef>
  >,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;

/**
 * Creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel(
  VM: Class<any>,
  configOrComponent?: any,
  configOrNothing?: any,
): any {
  if (
    typeof configOrComponent === 'function' ||
    (configOrComponent && configOrComponent.$$typeof !== undefined)
  ) {
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
  } else {
    const config = configOrComponent ?? {};
    const finalConfig = {
      ...config,
      ctx: {
        VM,
        generateId: config.generateId,
        ...config.ctx,
      },
    };

    return (Component: React.ComponentType<any>) =>
      withViewModelWrapper(VM, finalConfig, Component);
  }
}

const REACT_MEMO_SYMBOL = Symbol.for('react.memo');

const withViewModelWrapper = (
  VM: Class<any>,
  config: ViewModelHocConfig<any>,
  OriginalComponent?: React.ComponentType<any>,
) => {
  const processViewComponent =
    config.vmConfig?.processViewComponent ??
    viewModelsConfig.processViewComponent;

  const wrapViewsInObserver =
    config.vmConfig?.wrapViewsInObserver ??
    viewModelsConfig.wrapViewsInObserver;

  let Component =
    processViewComponent?.(OriginalComponent, VM, config) ?? OriginalComponent;

  if (
    wrapViewsInObserver &&
    Component &&
    (Component as any).$$typeof !== REACT_MEMO_SYMBOL
  ) {
    // @ts-expect-error
    Component = observer(Component);
  }

  const reactHook = config.reactHook;
  const getPayload = config.getPayload;
  const FallbackComponent =
    config.fallback ?? viewModelsConfig.fallbackComponent;

  const RawComponent = (allProps: any, ref: any) => {
    const viewModels = useContext(ViewModelsContext);

    reactHook?.(allProps, config.ctx!, viewModels, ref);

    const { payload: rawPayload, ...componentProps } = allProps;
    const payload = getPayload?.(allProps) ?? rawPayload;

    if (config.forwardRef && !('forwardedRef' in componentProps)) {
      componentProps.forwardedRef = ref;
    }

    const model = useCreateViewModel(VM, payload, {
      ...config,
      props: componentProps,
    }) as unknown as AnyViewModel | AnyViewModelSimple;

    const isRenderAllowedByStore =
      !viewModels || viewModels.isAbleToRenderView(model.id);

    // This condition is works for AnyViewModelSimple too
    // All other variants will be bad for performance
    const isRenderAllowed =
      isRenderAllowedByStore && (model as AnyViewModel).isMounted !== false;

    if (isRenderAllowed) {
      return (
        <ActiveViewModelContext.Provider value={model}>
          {Component && <Component {...componentProps} model={model} />}
        </ActiveViewModelContext.Provider>
      );
    }

    return (
      FallbackComponent && <FallbackComponent {...allProps} payload={payload} />
    );
  };

  let ConnectedViewModel = RawComponent;

  if (config.forwardRef) {
    ConnectedViewModel = forwardRef(ConnectedViewModel) as any;
  }

  ConnectedViewModel = observer(ConnectedViewModel);

  if (process.env.NODE_ENV !== 'production') {
    (ConnectedViewModel as React.ComponentType).displayName =
      `ConnectedViewModel(${VM.name}->Component)`;
  }

  // There is no problem to just assign it here to config
  // This property is needed to pass in `useCreateViewModel()` hook
  // @ts-expect-error
  config.component = ConnectedViewModel as unknown as VMComponent<
    AnyViewModel,
    any
  >;

  return ConnectedViewModel;
};
