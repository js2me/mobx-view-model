import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelComponentRef,
  ViewModelSimple,
} from 'mobx-view-model';
import type { AnyObject, Class, EmptyObject } from 'yummies/types';
import type { SComponent, SJSXElement, SRenderFn } from '../lib/solid-types.js';
import {
  type AllViewModelPropsKeys,
  type ViewModelHocConfig,
  type ViewModelPropsChargedProps,
  type ViewModelSimpleHocConfig,
  withViewModel,
} from './with-view-model.js';

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
> = ExtractVMPayload<TViewModel> &
  Omit<
    TComponentOriginProps,
    AllViewModelPropsKeys | keyof ExtractVMPayload<TViewModel>
  >;

export interface PropsVMComponent<
  TViewModel,
  TComponentOriginProps extends AnyObject = ExtractVMPayload<TViewModel>,
> extends ViewModelComponentRef<
  TViewModel extends AnyViewModel | AnyViewModelSimple
    ? TViewModel
    : AnyViewModel | AnyViewModelSimple
> {
  (props: PropsVMComponentProps<TViewModel, TComponentOriginProps>): SJSXElement;

  connect(
    anchor: SComponent<any>,
  ): PropsVMComponent<TViewModel, TComponentOriginProps>;
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
 */
export function withPropsViewModel<
  TViewModel,
  TComponentOriginProps extends AnyObject =
    InferPropsViewModelPayload<TViewModel>,
>(
  model: Class<TViewModel>,
  renderFn: SRenderFn<
    ViewModelPropsChargedProps<TComponentOriginProps, TViewModel>
  >,
  config?: TViewModel extends AnyViewModel
    ? PropsViewModelHocConfig<TViewModel>
    : PropsViewModelSimpleHocConfig<TViewModel>,
): PropsVMComponent<TViewModel, TComponentOriginProps> {
  return withViewModel(model, renderFn, {
    ...config,
    getPayload: allPropsAsPayload,
  }) as unknown as PropsVMComponent<TViewModel, TComponentOriginProps>;
}
