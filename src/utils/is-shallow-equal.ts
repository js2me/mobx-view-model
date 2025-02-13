import { isEqual } from 'lodash-es';

import { AnyObject } from './types.js';

export const isShallowEqual = (a: AnyObject, b: AnyObject) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (!isEqual(aKeys, bKeys)) return false;

  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }

  return true;
};
