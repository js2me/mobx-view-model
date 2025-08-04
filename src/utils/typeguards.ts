/* eslint-disable @typescript-eslint/ban-types */
import { ViewModel } from '../view-model/view-model.js';

import { AnyObject, Class, EmptyObject } from './types.js';

export const isViewModel = <TPayload extends AnyObject = EmptyObject>(
  value: AnyObject,
): value is ViewModel<TPayload> => value.payloadChanged;

export const isViewModelClass = <TPayload extends AnyObject = EmptyObject>(
  value: Function,
): value is Class<ViewModel<TPayload>> => value.prototype.payloadChanged;
