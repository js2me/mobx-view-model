import { ViewModelsRawConfig } from '../config';
import { AnyObject, EmptyObject, Maybe } from '../utils/types';

import { ViewModel } from './view-model';
import { ViewModelStore } from './view-model.store';

export type AnyViewModel = ViewModel<any, any>;

export interface ViewModelParams<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | null = null,
> {
  id: string;
  payload: Payload;
  viewModels?: Maybe<ViewModelStore>;
  parentViewModelId?: Maybe<string>;
  parentViewModel?: Maybe<ParentViewModel>;
  ctx?: AnyObject;
  config?: ViewModelsRawConfig;
}
