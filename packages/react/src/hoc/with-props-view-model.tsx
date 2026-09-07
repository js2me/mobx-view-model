import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelComponentRef,
  ViewModelSimple,
} from 'mobx-view-model';
import type { AnyObject, Class, EmptyObject, HasKey, IsUnknown } from 'yummies/types';
import {
  RComponentType,
  RForwardedRef,
  RLegacyRef,
  RReactNode,
} from '../lib/react-types.js';
import {
  type AllViewModelPropsKeys,
  type ExtractReactRef,
  type ViewModelHocConfig,
  type ViewModelPropsChargedProps,
  type ViewModelSimpleHocConfig,
  withViewModel,
} from './with-view-model.js';
import {
  type RRenderFn
} from "../lib/react-types.js";

type InferPropsViewModelPayload<TViewModel> = TViewModel extends AnyViewModel
  ? TViewModel['payload']
  : TViewModel extends {
        setPayload(payload: infer TPayload extends AnyObject): any;
      }
    ? TPayload
    : TViewModel extends ViewModelSimple<infer TPayload extends AnyObject>
      ? TPayload
      : EmptyObject;

type ExtractVMPayload<VM> = InferPropsViewModelPayload<VM>;

export type PropsVMComponentProps<
  TViewModel,
  TComponentOriginProps extends AnyObject = ExtractVMPayload<TViewModel>,
  TForwardedRef = unknown,
> = ExtractVMPayload<TViewModel> &
  Omit<
    TComponentOriginProps,
    AllViewModelPropsKeys | keyof ExtractVMPayload<TViewModel>
  > &
  (HasKey<TComponentOriginProps, 'ref'> extends true
    ? Required<TComponentOriginProps>['ref'] extends RForwardedRef<infer R>
      ? { ref?: RLegacyRef<R> }
      : Required<TComponentOriginProps>['ref'] extends RLegacyRef<infer R>
        ? { ref?: RLegacyRef<R> }
        : { ref?: RLegacyRef<ExtractReactRef<TComponentOriginProps['ref']>> }
    : IsUnknown<TForwardedRef> extends true
      ? {}
      : { ref?: RLegacyRef<TForwardedRef> });

export interface PropsVMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = ExtractVMPayload<TViewModel>,
  TForwardedRef = unknown,
> extends ViewModelComponentRef<
  TViewModel extends AnyViewModel | AnyViewModelSimple
    ? TViewModel
    : AnyViewModel | AnyViewModelSimple
> {
  (
    props: PropsVMComponentProps<TViewModel, TComponentOriginProps, TForwardedRef>,
  ): RReactNode;

  connect(
    anchor: RComponentType<any>,
  ): PropsVMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;
}

export type PropsViewModelHocConfig<VM extends AnyViewModel> = Omit<
  ViewModelHocConfig<VM>,
  'getPayload'
>;

export type PropsViewModelSimpleHocConfig<VM> = Omit<
  ViewModelSimpleHocConfig<VM>,
  'getPayload'
>;

const allPropsAsPayload = (props: AnyObject) => props;

/**
 * Like `withViewModel`, but treats all component props as the ViewModel payload.
 * The resulting component does not require a separate `payload` prop.
 *
 * [**Documentation**](https://js2me.github.io/mobx-view-model/react/api/with-props-view-model.html)
 */
export function withPropsViewModel<
  TViewModel,
  TComponentOriginProps extends AnyObject = InferPropsViewModelPayload<TViewModel>,
  TForwardedRef = unknown,
>(
  model: Class<TViewModel>,
  renderFn: RRenderFn<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel, TForwardedRef>
  >,
  config?: TViewModel extends AnyViewModel
    ? PropsViewModelHocConfig<TViewModel>
    : PropsViewModelSimpleHocConfig<TViewModel>,
): PropsVMComponent<TViewModel, TComponentOriginProps, TForwardedRef> {
  return withViewModel(model, renderFn, {
    ...config,
    getPayload: allPropsAsPayload,
  }) as unknown as PropsVMComponent<TViewModel, TComponentOriginProps, TForwardedRef>;
}
