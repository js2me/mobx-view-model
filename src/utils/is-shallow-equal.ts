import { isEqual } from 'lodash-es';

import { AnyObject, Maybe } from './types.js';

export const isShallowEqual = (a: Maybe<AnyObject>, b: Maybe<AnyObject>) => {
  if (a === b) {
    return true;
  }

  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  return isEqual(aKeys, bKeys) && aKeys.every((key) => a[key] === b[key]);
};
