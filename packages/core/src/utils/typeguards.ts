import type { AnyObject, Class, EmptyObject } from 'yummies/types';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelSimple,
} from '../view-model/index.js';
import { _internals } from '../internals.js';


export const isViewModel = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = AnyViewModel | AnyViewModelSimple | null ,
>(
  value: AnyObject,
): value is ViewModel<TPayload, ParentViewModel> =>
  value[_internals.marker] === true;

export const isViewModelClass = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = AnyViewModel | AnyViewModelSimple | null,
>(
  value: Function,
): value is Class<ViewModel<TPayload, ParentViewModel>> =>
  value.prototype[_internals.marker] === true;

export const isViewModelSimple = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = AnyViewModel | AnyViewModelSimple | null,
>(
  value: AnyObject,
): value is ViewModelSimple<TPayload, ParentViewModel> =>
  !isViewModel(value);

export const isViewModelSimpleClass = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = AnyViewModel | AnyViewModelSimple | null,
>(
  value: Function,
): value is Class<ViewModelSimple<TPayload, ParentViewModel>> =>
  !isViewModelClass(value);
