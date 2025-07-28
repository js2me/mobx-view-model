/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable sonarjs/no-nested-functions */
import { observer } from 'mobx-react-lite';
import { ComponentType, ReactNode, useContext } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  AllPropertiesOptional,
  AnyObject,
  Class,
  EmptyObject,
  Maybe,
} from '../utils/types.js';
import {
  AnyViewModel,
  ViewModel,
  ViewModelStore,
} from '../view-model/index.js';

declare const process: { env: { NODE_ENV?: string } };

export type ViewModelProps<VM extends AnyViewModel> = {
  model: VM;
};

export type ViewModelInputProps<VM extends AnyViewModel> =
  VM extends ViewModel<infer TPayload, any>
    ? TPayload extends EmptyObject
      ? AnyObject
      : AllPropertiesOptional<TPayload> extends true
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

export type VMComponentProps<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject,
> = Omit<TComponentOriginProps, 'model'> & ViewModelInputProps<TViewModel>;

export type VMComponent<
  TViewModel extends AnyViewModel,
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
 * Creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel(...args: any[]): any {
  const VM: Class<any> = args[0];
  let config: ViewModelHocConfig<any>;
  let PredefinedComponent: Maybe<ComponentType<any>>;

  if (typeof args[1] === 'function') {
    config = args[2] ?? {};
    PredefinedComponent = args[1];
  } else {
    config = args[1] ?? {};
  }

  const ctx: AnyObject = config.ctx ?? {};

  ctx.VM = VM;
  ctx.generateId = config?.generateId;

  config.ctx = ctx;

  if (PredefinedComponent) {
    return withViewModelWrapper(VM, config, PredefinedComponent);
  }

  return (Component: any) => withViewModelWrapper(VM, config, Component);
}

const withViewModelWrapper = (
  VM: Class<any>,
  config: ViewModelHocConfig<any>,
  OriginalComponent?: ComponentType<any>,
) => {
  let Component =
    (
      config.config?.processViewComponent ??
      config.vmConfig?.processViewComponent ??
      viewModelsConfig.processViewComponent
    )?.(OriginalComponent, VM, config) ?? OriginalComponent;

  if (
    Component &&
    (config.config?.wrapViewsInObserver ??
      config.vmConfig?.wrapViewsInObserver ??
      viewModelsConfig.wrapViewsInObserver) &&
    (Component as any).$$typeof !== Symbol.for('react.memo')
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Component = observer(Component);
  }

  const ConnectedViewModel = observer((allProps: any) => {
    const viewModels = useContext(ViewModelsContext);

    config?.reactHook?.(allProps, config.ctx!, viewModels);

    const { payload: rawPayload, ...componentProps } = allProps;

    const payload = config?.getPayload
      ? config.getPayload(allProps)
      : rawPayload;

    const instance = useCreateViewModel<AnyViewModel>(VM, payload, {
      ...config,
      component: ConnectedViewModel,
      componentProps,
    });

    const isRenderAllowedByStore =
      !viewModels || viewModels.isAbleToRenderView(instance.id);
    const isRenderAllowedLocally = !!instance.isMounted;
    const isRenderAllowed = isRenderAllowedByStore && isRenderAllowedLocally;

    if (isRenderAllowed) {
      return (
        <ActiveViewModelContext.Provider value={instance}>
          {Component && (
            <Component {...(componentProps as any)} model={instance} />
          )}
        </ActiveViewModelContext.Provider>
      );
    }

    const FallbackComponent =
      config?.fallback ?? viewModelsConfig.fallbackComponent;

    return FallbackComponent ? (
      <FallbackComponent {...allProps} payload={payload} />
    ) : null;
  });

  if (process.env.NODE_ENV !== 'production') {
    Object.assign(ConnectedViewModel, {
      displayName: `ConnectedViewModel(${VM.name}->Component)`,
    });
  }

  return ConnectedViewModel;
};
