import type { AnyObject, Class, EmptyObject } from 'yummies/types';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelSimple,
} from '../view-model/index.js';

export const isViewModel = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
>(
  value: AnyObject,
): value is ViewModel<TPayload, ParentViewModel> => value.payloadChanged;

export const isViewModelClass = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
>(
  value: Function,
): value is Class<ViewModel<TPayload, ParentViewModel>> =>
  value.prototype.payloadChanged;

export const isViewModeSimpleClass = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
>(
  value: Function,
): value is Class<ViewModelSimple<TPayload, ParentViewModel>> =>
  !isViewModelClass(value);
