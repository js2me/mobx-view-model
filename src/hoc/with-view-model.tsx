/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable sonarjs/no-nested-functions */
import { observer } from 'mobx-react-lite';
import { ComponentClass, ComponentType, ReactNode, useContext } from 'react';

import { viewModelsConfig } from '../config/global-config.js';
import {
  ActiveViewModelContext,
  ViewModelsContext,
} from '../contexts/index.js';
import {
  useCreateViewModel,
  UseCreateViewModelConfig,
} from '../hooks/use-create-view-model.js';
import {
  AnyObject,
  Class,
  EmptyObject,
  IsPartial,
  Maybe,
} from '../utils/types.js';
import {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelSimple,
  ViewModelStore,
} from '../view-model/index.js';

// eslint-disable-next-line @typescript-eslint/ban-types
type FixedComponentType<P extends AnyObject = {}> =
  /**
   * Fixes typings loss with use `withViewModel` with inline function component
   */
  ((props: P) => ReactNode) | ComponentClass<P>;

declare const process: { env: { NODE_ENV?: string } };

export type ViewModelProps<VM extends AnyViewModel | AnyViewModelSimple> = {
  model: VM;
};

export type ViewModelInputProps<VM extends AnyViewModel | AnyViewModelSimple> =
  VM extends ViewModel<infer TPayload, any>
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

export interface ViewModelHocConfig<VM extends AnyViewModel>
  extends Omit<UseCreateViewModelConfig<VM>, 'component' | 'componentProps'> {
  /**
   * Component to render if the view model initialization takes too long
   */
  fallback?: ComponentType;

  /**
   * Function to invoke additional React hooks in the resulting component
   */
  reactHook?: (
    allProps: AnyObject,
    ctx: AnyObject,
    viewModels: Maybe<ViewModelStore>,
  ) => void;

  /**
   * Function that should return the payload for the VM
   * by default, it is - (props) => props.payload
   */
  getPayload?: (allProps: any) => any;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ViewModelSimpleHocConfig<VM extends AnyViewModelSimple> {
  /**
   * Component to render if the view model initialization takes too long
   */
  fallback?: ComponentType;

  /**
   * Function to invoke additional React hooks in the resulting component
   */
  reactHook?: (
    allProps: AnyObject,
    ctx: AnyObject,
    viewModels: Maybe<ViewModelStore>,
  ) => void;

  /**
   * Function that should return the payload for the VM
   * by default, it is - (props) => props.payload
   */
  getPayload?: (allProps: any) => any;
}

export type VMComponentProps<
  TViewModel extends AnyViewModel | AnyViewModelSimple,
  TComponentOriginProps extends AnyObject,
> = Omit<TComponentOriginProps, 'model'> & ViewModelInputProps<TViewModel>;

export type VMComponent<
  TViewModel extends AnyViewModel | AnyViewModelSimple,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
> = (props: VMComponentProps<TViewModel, TComponentOriginProps>) => ReactNode;

/**
 * @deprecated use `VMComponent` type. Will be removed in next major release.
 */
export type ComponentWithViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
> = VMComponent<TViewModel, TComponentOriginProps>;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
>(
  model: Class<TViewModel>,
  component: ComponentType<TComponentOriginProps & ViewModelProps<TViewModel>>,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<TViewModel extends AnyViewModel>(
  model: Class<TViewModel>,
  config?: ViewModelHocConfig<TViewModel>,
): <TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>>(
  Component?: ComponentType<TComponentOriginProps & ViewModelProps<TViewModel>>,
) => VMComponent<TViewModel, TComponentOriginProps>;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<TViewModel extends AnyViewModelSimple>(
  model: Class<TViewModel>,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): <TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>>(
  Component?: FixedComponentType<
    TComponentOriginProps & ViewModelProps<TViewModel>
  >,
) => VMComponent<TViewModel, TComponentOriginProps>;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<
  TViewModel extends AnyViewModelSimple,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
>(
  model: Class<TViewModel>,
  component: FixedComponentType<
    TComponentOriginProps & ViewModelProps<TViewModel>
  >,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

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

    return (Component: ComponentType<any>) =>
      withViewModelWrapper(VM, finalConfig, Component);
  }
}

const REACT_MEMO_SYMBOL = Symbol.for('react.memo');

const withViewModelWrapper = (
  VM: Class<any>,
  config: ViewModelHocConfig<any>,
  OriginalComponent?: ComponentType<any>,
) => {
  const processViewComponent =
    config.config?.processViewComponent ??
    config.vmConfig?.processViewComponent ??
    viewModelsConfig.processViewComponent;

  const wrapViewsInObserver =
    config.config?.wrapViewsInObserver ??
    config.vmConfig?.wrapViewsInObserver ??
    viewModelsConfig.wrapViewsInObserver;

  let Component =
    processViewComponent?.(OriginalComponent, VM, config) ?? OriginalComponent;

  if (
    wrapViewsInObserver &&
    Component &&
    (Component as any).$$typeof !== REACT_MEMO_SYMBOL
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Component = observer(Component);
  }

  const reactHook = config.reactHook;
  const getPayload = config.getPayload;
  const FallbackComponent =
    config.fallback ?? viewModelsConfig.fallbackComponent;

  const ConnectedViewModel = observer((allProps: any) => {
    const viewModels = useContext(ViewModelsContext);

    reactHook?.(allProps, config.ctx!, viewModels);

    const { payload: rawPayload, ...componentProps } = allProps;

    const payload = getPayload?.(allProps) ?? rawPayload;

    const model = useCreateViewModel(VM, payload, {
      ...config,
      component: ConnectedViewModel,
      props: componentProps,
    }) as unknown as AnyViewModel | AnyViewModelSimple;

    const isRenderAllowedByStore =
      !viewModels || viewModels.isAbleToRenderView(model.id);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const isRenderAllowedLocally = model.isMounted !== false;
    const isRenderAllowed = isRenderAllowedByStore && isRenderAllowedLocally;

    if (isRenderAllowed) {
      return (
        <ActiveViewModelContext.Provider value={model}>
          {Component && <Component {...componentProps} model={model} />}
        </ActiveViewModelContext.Provider>
      );
    }

    return FallbackComponent ? (
      <FallbackComponent {...allProps} payload={payload} />
    ) : null;
  });

  if (process.env.NODE_ENV !== 'production') {
    ConnectedViewModel.displayName = `ConnectedViewModel(${VM.name}->Component)`;
  }

  return ConnectedViewModel;
};
