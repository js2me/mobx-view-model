/* eslint-disable sonarjs/no-nested-functions */
import { observer } from 'mobx-react-lite';
import {
  ComponentType,
  ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

import { ActiveViewModelContext, ViewModelsContext } from '../contexts';
import { generateVMId } from '../utils';
import { AnyObject, Class, EmptyObject, Maybe } from '../utils/types';
import { AnyViewModel, ViewModel, ViewModelCreateConfig } from '../view-model';

declare const process: { env: { NODE_ENV?: string } };

export type ViewModelProps<VM extends AnyViewModel> = {
  model: VM;
};

export type ViewModelInputProps<VM extends AnyViewModel> =
  VM['payload'] extends EmptyObject ? AnyObject : { payload: VM['payload'] };

export type ViewModelHocConfig<VM extends AnyViewModel> = {
  /**
   * Уникальный идентификатор вьюшки
   */
  id?: Maybe<string>;

  /**
   * Функция генератор идентификатор для вью модели
   */
  generateId?: (ctx: AnyObject) => string;

  /**
   * Компонент, который будет отрисован в случае если инциализация вью модели происходит слишком долго
   */
  fallback?: ComponentType;

  /**
   * Доп. данные, которые могут быть полезны при создании VM
   */
  ctx?: AnyObject;

  /**
   * Функция, в которой можно вызывать доп. реакт хуки в результирующем компоненте
   */
  reactHooks?: (allProps: any) => void;

  /**
   * Функция, которая должна возвращать payload для VM
   * по умолчанию это - (props) => props.payload
   */
  getPayload?: (allProps: any) => any;

  /**
   * Функция создания экземпляра класса VM
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
  Component: ComponentType<TComponentOriginProps & ViewModelProps<TViewModel>>,
) => ComponentWithViewModel<TViewModel, TComponentOriginProps>;

export function withViewModel(
  Model: Class<any>,
  config?: ViewModelHocConfig<any>,
) {
  const ctx: AnyObject = config?.ctx ?? {};

  ctx.VM = Model;
  ctx.generateId = config?.generateId;

  return (Component: ComponentType<any>) => {
    const instances = new Map<string, AnyViewModel>();

    const ConnectedViewModel = observer((allProps: any) => {
      const { payload: rawPayload, ...componentProps } = allProps;

      const payload = config?.getPayload
        ? config.getPayload(allProps)
        : rawPayload;

      const idRef = useRef<string>('');
      const viewModels = useContext(ViewModelsContext);
      const parentViewModel = useContext(ActiveViewModelContext) || null;

      if (!idRef.current) {
        idRef.current =
          viewModels?.generateViewModelId({
            ctx,
            id: config?.id,
            VM: Model,
            parentViewModelId: parentViewModel?.id,
            fallback: config?.fallback,
            instances,
          }) ??
          config?.id ??
          generateVMId(ctx);
      }

      const id = idRef.current;

      if (!instances.has(id)) {
        const configCreate: ViewModelCreateConfig<any> = {
          id,
          parentViewModelId: parentViewModel?.id,
          payload,
          VM: Model,
          viewModels,
          parentViewModel,
          fallback: config?.fallback,
          instances,
          ctx,
          component: ConnectedViewModel,
          componentProps,
        };

        viewModels?.processCreateConfig(configCreate);

        const instance =
          config?.factory?.(configCreate) ??
          viewModels?.createViewModel<any>(configCreate) ??
          new Model(configCreate);

        instances.set(id, instance);

        if (viewModels) {
          viewModels.attach(instance);
        } else {
          instance.mount();
        }
      }

      const instance: ViewModel = instances.get(id)!;

      useEffect(() => {
        return () => {
          if (viewModels) {
            viewModels.detach(id);
          } else {
            instance.unmount();
          }
          instances.delete(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      useLayoutEffect(() => {
        instance.setPayload(payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [payload]);

      config?.reactHooks?.(allProps);

      if (
        (!viewModels || viewModels.isAbleToRenderView(id)) &&
        instance.isMounted
      ) {
        return (
          <ActiveViewModelContext.Provider value={instance}>
            <Component {...(componentProps as any)} model={instance} />
          </ActiveViewModelContext.Provider>
        );
      }

      return config?.fallback ? <config.fallback /> : null;
    });

    if (process.env.NODE_ENV !== 'production') {
      Object.assign(ConnectedViewModel, {
        displayName: `ConnectedViewModel(${Model.name}->Component)`,
      });
    }

    return ConnectedViewModel;
  };
}
