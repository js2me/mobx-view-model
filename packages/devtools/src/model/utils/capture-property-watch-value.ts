import { toJS } from 'mobx';
import { isInaccessible } from './safe-access';

export const capturePropertyWatchValue = (value: unknown): unknown => {
  if (isInaccessible(value)) {
    return value;
  }

  try {
    return toJS(value);
  } catch {
    return value;
  }
};
