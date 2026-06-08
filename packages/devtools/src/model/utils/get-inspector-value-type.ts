import { getConstructorName, isInaccessible } from './safe-access';

export function getInspectorValueType(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'function') {
    return 'function';
  }

  if (typeof value === 'object') {
    if (isInaccessible(value)) {
      return 'instance';
    }

    const constructorName = getConstructorName(value);
    if (constructorName && constructorName !== 'Object') {
      return 'instance';
    }

    return 'object';
  }

  return typeof value;
}
