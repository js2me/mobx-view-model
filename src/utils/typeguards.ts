import type { AnyObject, Class, EmptyObject } from 'yummies/types';
import type { ViewModel } from '../view-model/index.js';

export const isViewModel = <TPayload extends AnyObject = EmptyObject>(
  value: AnyObject,
): value is ViewModel<TPayload> => value.payloadChanged;

export const isViewModelClass = <TPayload extends AnyObject = EmptyObject>(
  value: Function,
): value is Class<ViewModel<TPayload>> => value.prototype.payloadChanged;
