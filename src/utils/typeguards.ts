/* eslint-disable @typescript-eslint/ban-types */
import { ViewModel } from '../view-model/view-model.js';

import { AnyObject, Class, EmptyObject } from './types.js';

export const isViewModel = <TPayload extends AnyObject = EmptyObject>(
  value: AnyObject,
): value is ViewModel<TPayload> => 'payloadChanged' in value;

export const isViewModelClass = <TPayload extends AnyObject = EmptyObject>(
  value: Function,
): value is Class<ViewModel<TPayload>> => 'payloadChanged' in value.constructor;
