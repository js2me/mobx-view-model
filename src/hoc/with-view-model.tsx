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
import { AnyViewModel, ViewModelStore } from '../view-model/index.js';

declare const process: { env: { NODE_ENV?: string } };

export type ViewModelProps<VM extends AnyViewModel> = {
  model: VM;
};

export type ViewModelInputProps<VM extends AnyViewModel> =
  VM['payload'] extends EmptyObject
    ? AnyObject
    : AllPropertiesOptional<VM['payload']> extends true
      ? {
          payload?: VM['payload'];
        }
      : {
          payload: VM['payload'];
        };

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

export type ComponentWithViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
> = (
  props: Omit<TComponentOriginProps, 'model'> & ViewModelInputProps<TViewModel>,
) => ReactNode;

export function withViewModel<TViewModel extends AnyViewModel>(
  model: Class<TViewModel>,
  config?: ViewModelHocConfig<TViewModel>,
): <TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>>(
  Component?: ComponentType<TComponentOriginProps & ViewModelProps<TViewModel>>,
) => ComponentWithViewModel<TViewModel, TComponentOriginProps>;

/**
 * Creates new instance of ViewModel
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-view-model.html)
 */
export function withViewModel(
  VM: Class<any>,
  config: ViewModelHocConfig<any> = {},
) {
  const ctx: AnyObject = config.ctx ?? {};

  ctx.VM = VM;
  ctx.generateId = config?.generateId;

  config.ctx = ctx;

  return (OriginalComponent?: ComponentType<any>) => {
    let Component =
      (
        config.config?.processViewComponent ??
        viewModelsConfig.processViewComponent
      )?.(OriginalComponent, VM, config) ?? OriginalComponent;

    if (
      Component &&
      (config.config?.wrapViewsInObserver ??
        viewModelsConfig.wrapViewsInObserver)
    ) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Component = observer(Component);
    }

    const ConnectedViewModel = observer((allProps: any) => {
      const viewModels = useContext(ViewModelsContext);

      config?.reactHook?.(allProps, ctx, viewModels);

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
}
