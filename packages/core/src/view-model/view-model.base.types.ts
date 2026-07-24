import { AnyObject, Defined } from 'yummies/types';
import type { ViewModelBase } from './view-model.base.js';
import type { ViewModelParams } from './view-model.types.js';

export type InferViewModelParams<T> = T extends ViewModelBase<
  infer T1,
  infer T2,
  infer T3
>
  ? ViewModelParams<T1, T2, T3>
  : ViewModelParams<{}, null, {}>

export type InferViewModelPayload<T> = InferViewModelParams<T>['payload']
export type InferViewModelProps<T> = Defined<InferViewModelParams<T>['props']>

export type ViewModelState =  'init' | 'mounting' | 'mounted' | 'unmounting' | 'unmounted'