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
} from '../utils/types.js';
import { AnyViewModel } from '../view-model/index.js';

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

export type ViewModelHocConfig<VM extends AnyViewModel> =
  UseCreateViewModelConfig<VM> & {
    /**
     * Component to render if the view model initialization takes too long
     */
    fallback?: ComponentType;

    /**
     * Function to invoke additional React hooks in the resulting component
     */
    reactHooks?: (allProps: any, ctx: AnyObject) => void;

    /**
     * Function that should return the payload for the VM
     * by default, it is - (props) => props.payload
     */
    getPayload?: (allProps: any) => any;
  };

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

export function withViewModel(
  VM: Class<any>,
  config: ViewModelHocConfig<any> = {},
) {
  const ctx: AnyObject = config.ctx ?? {};

  ctx.VM = VM;
  ctx.generateId = config?.generateId;

  config.ctx = ctx;

  return (Component?: ComponentType<any>) => {
    const ConnectedViewModel = observer((allProps: any) => {
      const { payload: rawPayload, ...componentProps } = allProps;

      const payload = config?.getPayload
        ? config.getPayload(allProps)
        : rawPayload;

      const viewModels = useContext(ViewModelsContext);

      config?.reactHooks?.(allProps, ctx);

      const instance = useCreateViewModel(VM, payload, {
        ...config,
        component: ConnectedViewModel,
        componentProps,
      });

      const isRenderAllowedByStore =
        !viewModels || viewModels.isAbleToRenderView(instance.id);
      const isRenderAllowedLocally = !!instance?.isMounted;
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
