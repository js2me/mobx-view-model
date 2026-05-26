import { getConstructorName, isInaccessible } from './safe-access';

export type PropertyValueType =
  | 'array'
  | 'object'
  | 'instance'
  | 'function'
  | 'primitive';

export const getPropertyInstanceClassName = (data: unknown): string => {
  if (isInaccessible(data)) {
    return '<Inaccessible>';
  }

  const constructorName = getConstructorName(data);
  if (constructorName) {
    return constructorName;
  }

  const match = /^\[object (.+)\]$/.exec(
    data == null ? '[object Object]' : Object.prototype.toString.call(data),
  );

  if (match?.[1] && match[1] !== 'Object') {
    return match[1];
  }

  return 'Object';
};

export const detectPropertyValueType = (
  data: unknown,
): PropertyValueType => {
  if (isInaccessible(data)) {
    return 'primitive';
  }

  if (Array.isArray(data)) {
    return 'array';
  }

  if (typeof data === 'function') {
    return 'function';
  }

  if (data && typeof data === 'object') {
    if (getPropertyInstanceClassName(data) !== 'Object') {
      return 'instance';
    }

    return 'object';
  }

  return 'primitive';
};
