import type { ViewModelBase } from './view-model.base.js';
import type { ViewModelParams } from './view-model.types.js';

export type InferViewModelParams<T> = T extends ViewModelBase<
  infer T1,
  infer T2,
  infer T3
>
  ? ViewModelParams<T1, T2, T3>
  : never;
