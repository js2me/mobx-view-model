/* eslint-disable sonarjs/no-nested-functions */
import { observer } from 'mobx-react-lite';
import {
  ComponentType,
  ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import { ViewModelsConfig } from '../config';
import { mergeVMConfigs } from '../config/utils/merge-vm-configs';
import { ActiveViewModelContext, ViewModelsContext } from '../contexts';
import { generateVMId } from '../utils';
import {
  AllPropertiesOptional,
  AnyObject,
  Class,
  EmptyObject,
  Maybe,
} from '../utils/types';
import {
  AnyViewModel,
  ViewModelCreateConfig,
  ViewModelParams,
} from '../view-model';

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

export type ViewModelHocConfig<VM extends AnyViewModel> = {
  /**
   * Unique identifier for the view
   */
  id?: Maybe<string>;

  /**
   * Function to generate an identifier for the view model
   */
  generateId?: (ctx: AnyObject) => string;

  /**
   * Component to render if the view model initialization takes too long
   */
  fallback?: ComponentType;

  /**
   * Additional configuration for the view model
   * See {@link ViewModelsConfig}
   */
  config?: Partial<ViewModelsConfig>;

  /**
   * Additional data that may be useful when creating the VM
   */
  ctx?: AnyObject;

  /**
   * Function to invoke additional React hooks in the resulting component
   */
  reactHooks?: (allProps: any, ctx: AnyObject) => void;

  /**
   * Function that should return the payload for the VM
   * by default, it is - (props) => props.payload
   */
  getPayload?: (allProps: any) => any;

  /**
   * Function to create an instance of the VM class
   */
  factory?: (config: ViewModelCreateConfig<VM>) => VM;
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
  config?: ViewModelHocConfig<any>,
) {
  const ctx: AnyObject = config?.ctx ?? {};

  ctx.VM = VM;
  ctx.generateId = config?.generateId;

  return (Component?: ComponentType<any>) => {
    const ConnectedViewModel = observer((allProps: any) => {
      const { payload: rawPayload, ...componentProps } = allProps;

      const payload = config?.getPayload
        ? config.getPayload(allProps)
        : rawPayload;

      const idRef = useRef<string>('');
      const viewModels = useContext(ViewModelsContext);
      const parentViewModel = useContext(ActiveViewModelContext) || null;

      config?.reactHooks?.(allProps, ctx);

      if (!idRef.current) {
        idRef.current =
          viewModels?.generateViewModelId({
            ...config,
            ctx,
            VM,
            parentViewModelId: parentViewModel?.id,
          }) ??
          config?.id ??
          generateVMId(ctx);
      }

      const id = idRef.current;

      const instanceFromStore = viewModels ? viewModels.get(id) : null;
      const lastInstance = useRef<any>(null);

      const instance = useMemo(() => {
        if (instanceFromStore) {
          return instanceFromStore;
        }

        if (lastInstance.current) {
          return lastInstance.current;
        }

        const configCreate: ViewModelCreateConfig<any> = {
          ...config,
          config: config?.config,
          id,
          parentViewModelId: parentViewModel?.id,
          payload,
          VM,
          viewModels,
          parentViewModel,
          ctx,
          component: ConnectedViewModel,
          componentProps,
        };

        viewModels?.processCreateConfig(configCreate);

        const instance =
          config?.factory?.(configCreate) ??
          viewModels?.createViewModel<any>(configCreate) ??
          new VM({
            ...configCreate,
            config: mergeVMConfigs(configCreate.config),
          } satisfies ViewModelParams<any>);

        lastInstance.current = instance;

        return instance;
      }, [instanceFromStore]);

      const isRenderAllowedByStore =
        !viewModels || viewModels.isAbleToRenderView(id);
      const isRenderAllowedLocally = !!instance?.isMounted;
      const isRenderAllowed = isRenderAllowedByStore && isRenderAllowedLocally;

      useLayoutEffect(() => {
        if (viewModels) {
          viewModels.attach(instance);
          return () => {
            viewModels.detach(id);
            lastInstance.current = null;
          };
        } else {
          instance.mount();
          return () => {
            instance.unmount();
            lastInstance.current = null;
          };
        }
      }, []);

      useLayoutEffect(() => {
        instance?.setPayload(payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [payload]);

      if (isRenderAllowed) {
        return (
          <ActiveViewModelContext.Provider value={instance}>
            {Component && (
              <Component {...(componentProps as any)} model={instance} />
            )}
          </ActiveViewModelContext.Provider>
        );
      }

      return config?.fallback ? <config.fallback /> : null;
    });

    if (process.env.NODE_ENV !== 'production') {
      Object.assign(ConnectedViewModel, {
        displayName: `ConnectedViewModel(${VM.name}->Component)`,
      });
    }

    return ConnectedViewModel;
  };
}
