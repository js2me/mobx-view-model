import { observer } from 'mobx-react-lite';
import { useContext } from 'react';
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

export type ViewModelProps<VM> = {
  model: VM;
};

export type ViewModelInputProps<VM> = VM extends ViewModel<infer TPayload, any>
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
  fallback?: React.ComponentType;

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

export interface ViewModelSimpleHocConfig<_VM> {
  /**
   * Component to render if the view model initialization takes too long
   */
  fallback?: React.ComponentType;

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
  TViewModel,
  TComponentOriginProps extends AnyObject,
> = Omit<TComponentOriginProps, 'model'> & ViewModelInputProps<TViewModel>;

export type VMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
> = (
  props: VMComponentProps<TViewModel, TComponentOriginProps>,
) => React.ReactNode;

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
  component: React.ComponentType<
    TComponentOriginProps & ViewModelProps<TViewModel>
  >,
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
  Component?: React.ComponentType<
    TComponentOriginProps & ViewModelProps<TViewModel>
  >,
) => VMComponent<TViewModel, TComponentOriginProps>;

/**
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<TViewModel>(
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
 * A Higher-Order Component that connects React components to their ViewModels, providing seamless MobX integration.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel<
  TViewModel,
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

    // This condition is works for AnyViewModelSimple too
    // All other variants will be bad for performance
    const isRenderAllowedLocally = (model as AnyViewModel).isMounted !== false;
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
