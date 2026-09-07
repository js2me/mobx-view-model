import { enableObservableTracking } from 'mobx-solid';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelComponentRef,
  ViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { _internals, isViewModel, viewModelsConfig } from 'mobx-view-model';
import { Show, splitProps, useContext, type Component } from 'solid-js';
import type {
  AnyObject,
  Class,
  Defined,
  EmptyObject,
  IsPartial,
  Maybe,
} from 'yummies/types';
import { ActiveViewModelProvider } from '../components/index.js';
import { ViewModelsContext } from '../contexts/index.js';
import {
  type UseCreateViewModelConfig,
  useCreateViewModel,
} from '../hooks/index.js';
import type { SComponent, SJSXElement, SRenderFn } from '../lib/solid-types.js';

export type ViewModelProps<VM> = { model: VM };

export type ViewModelPropsChargedProps<
  TComponentOriginProps extends AnyObject,
  TViewModel,
> = TComponentOriginProps & ViewModelProps<TViewModel>;

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

export type WithViewModelSolidHook = (
  allProps: AnyObject,
  ctx: AnyObject,
  viewModels: Maybe<ViewModelStore>,
) => void;

export interface ViewModelHocConfig<VM extends AnyViewModel>
  extends Omit<UseCreateViewModelConfig<VM>, 'component' | 'componentProps'> {
  /**
   * Component to render while the view model is mounting
   */
  fallback?: SComponent;

  /**
   * Extra Solid reactive setup in the resulting component
   */
  solidHook?: WithViewModelSolidHook;

  /**
   * Function that should return the payload for the VM.
   * Default: `(props) => props.payload`
   */
  getPayload?: (allProps: any) => any;

  /**
   * Additional component anchors for the same VM instance.
   * `useViewModel(AnchorComponent)` returns this VM when connected component is mounted.
   */
  anchors?: SComponent<any>[];
}

export interface ViewModelSimpleHocConfig<_VM> {
  fallback?: SComponent;
  solidHook?: WithViewModelSolidHook;
  getPayload?: (allProps: any) => any;
  anchors?: SComponent<any>[];
}

export type AllViewModelPropsKeys = keyof Required<ViewModelProps<any>>;

export type VMComponentProps<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
> = Omit<TComponentOriginProps, AllViewModelPropsKeys> &
  VMInputPayloadPropObj<TViewModel>;

export interface VMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
> extends ViewModelComponentRef<
  TViewModel extends AnyViewModel | AnyViewModelSimple
    ? TViewModel
    : AnyViewModel | AnyViewModelSimple
> {
  (props: VMComponentProps<TViewModel, TComponentOriginProps>): SJSXElement;

  /**
   * Registers an anchor component for the same VM instance.
   */
  connect(
    anchor: SComponent<any>,
  ): VMComponent<TViewModel, TComponentOriginProps>;
}

type VMHocFullConfig = ViewModelSimpleHocConfig<any> &
  ViewModelHocConfig<any> & {
    component: VMComponent<any>;
  };

/**
 * Higher-order component that connects a Solid view to a ViewModel.
 * MobX reactivity comes from `mobx-solid` (`enableObservableTracking`) — no observer wrapper needed.
 */
export function withViewModel<
  TViewModel extends AnyViewModel,
  TComponentOriginProps extends AnyObject = AnyObject,
>(
  VM: Class<TViewModel>,
  renderFn: SRenderFn<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel>
  >,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

/**
 * Higher-order component that connects a Solid view to a ViewModelSimple.
 */
export function withViewModel<
  TViewModel,
  TComponentOriginProps extends AnyObject = ViewModelProps<TViewModel>,
>(
  VM: Class<TViewModel>,
  renderFn: SRenderFn<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel>
  >,
  config?: ViewModelSimpleHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

/**
 * Higher-order component that connects a Solid view to a ViewModel.
 */
export function withViewModel(
  VM: Class<any>,
  rawRenderFn?: SRenderFn<AnyObject>,
  rawConfig?: ViewModelSimpleHocConfig<any> & ViewModelHocConfig<any>,
): any {
  enableObservableTracking();

  const config = (rawConfig ?? {}) as VMHocFullConfig;
  const anchors = (config.anchors ??= []);
  const getPayload: Defined<VMHocFullConfig['getPayload']> =
    config.getPayload ?? viewModelsConfig.getPayload;
  const Fallback = (config.fallback ??
    config.vmConfig?.fallbackComponent ??
    viewModelsConfig.fallbackComponent) as SComponent | undefined;

  const processViewComponent =
    config.vmConfig?.processRender ?? viewModelsConfig.processRender;

  const renderFn =
    (processViewComponent?.(rawRenderFn, VM, config) as
      | SRenderFn<AnyObject>
      | undefined) ??
    rawRenderFn ??
    _internals.noop;

  const View = renderFn as Component<any>;

  const Wrapper: Component<any> = (allProps) => {
    const viewModels = useContext(ViewModelsContext);
    const [, rest] = splitProps(allProps, ['payload']);
    const model = useCreateViewModel(
      VM,
      () => getPayload(allProps),
      config,
      allProps,
    ) as AnyViewModel | AnyViewModelSimple;

    (
      config.solidHook ??
      (viewModelsConfig.reactHook as WithViewModelSolidHook | undefined)
    )?.(allProps, config.ctx ?? {}, viewModels);

    return (
      <ActiveViewModelProvider value={model}>
        <Show
          when={() => !isViewModel(model) || model.isMounted}
          fallback={Fallback ? <Fallback /> : null}
        >
          <View {...rest} model={model} />
        </Show>
      </ActiveViewModelProvider>
    );
  };

  const ConnectVMComponent = Wrapper as VMComponent<typeof VM>;

  anchors.push(ConnectVMComponent);

  ConnectVMComponent.connect = (anchor: SComponent<any>) => {
    if (!anchors.includes(anchor)) {
      anchors.push(anchor);
    }
    return ConnectVMComponent;
  };

  return ConnectVMComponent;
}
