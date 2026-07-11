import type { AnyObject, Class, EmptyObject } from 'yummies/types';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModel,
  ViewModelSimple,
} from '../view-model/index.js';
import { VIEW_MODEL_MARKER } from '../symbols/index.js';


export const isViewModel = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
>(
  value: AnyObject,
): value is ViewModel<TPayload, ParentViewModel> =>
  value[VIEW_MODEL_MARKER] === true;

export const isViewModelClass = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
>(
  value: Function,
): value is Class<ViewModel<TPayload, ParentViewModel>> =>
  value.prototype[VIEW_MODEL_MARKER] === true;

export const isViewModelSimple = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
>(
  value: AnyObject,
): value is ViewModelSimple<TPayload, ParentViewModel> =>
  !isViewModel(value);

export const isViewModelSimpleClass = <
  TPayload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
>(
  value: Function,
): value is Class<ViewModelSimple<TPayload, ParentViewModel>> =>
  !isViewModelClass(value);
