import { toJS } from 'mobx';
import { getInspectorValueType } from './get-inspector-value-type';
import {
  getConstructorName,
  INACCESSIBLE_DISPLAY_LABEL,
  isInaccessible,
} from './safe-access';

const replacer = (_key: string, value: unknown) => {
  if (typeof value === 'bigint') {
    return `${String(value)}n`;
  }

  if (typeof value === 'symbol') {
    return `Symbol(${Symbol.keyFor(value) ?? ''})`;
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }

  return value;
};

export const formatCopyableValue = (value: unknown): string => {
  if (isInaccessible(value)) {
    return '';
  }

  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  const valueType = typeof value;

  if (valueType === 'string') {
    return value;
  }

  if (valueType === 'number' || valueType === 'boolean') {
    return String(value);
  }

  if (valueType === 'bigint') {
    return `${String(value)}n`;
  }

  if (valueType === 'symbol') {
    return String(value);
  }

  if (valueType === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return fn.name || 'anonymous';
  }

  try {
    const plain = toJS(value);
    return JSON.stringify(plain, replacer, 2);
  } catch {
    return formatPropertyWatchFallback(value);
  }
};

export const formatPropertyWatchValue = (value: unknown): string => {
  if (isInaccessible(value)) {
    return INACCESSIBLE_DISPLAY_LABEL;
  }

  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  const valueType = typeof value;

  if (valueType === 'string') {
    return JSON.stringify(value);
  }

  if (valueType === 'number' || valueType === 'boolean') {
    return String(value);
  }

  if (valueType === 'bigint') {
    return `${String(value)}n`;
  }

  if (valueType === 'symbol') {
    return `Symbol(${Symbol.keyFor(value as symbol) ?? ''})`;
  }

  if (valueType === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return `[Function ${fn.name || 'anonymous'}]`;
  }

  try {
    const plain = toJS(value);
    return JSON.stringify(plain, replacer);
  } catch {
    return formatPropertyWatchFallback(value);
  }
};

const formatPropertyWatchFallback = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[Array(${value.length})]`;
  }

  if (value && typeof value === 'object') {
    const inspectorType = getInspectorValueType(value);

    if (inspectorType === 'array') {
      return `[Array(${(value as unknown[]).length})]`;
    }

    const constructorName = getConstructorName(value);

    if (constructorName && constructorName !== 'Object') {
      return `[${constructorName}]`;
    }

    try {
      const keys = Object.keys(value);
      return `{${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', …' : ''}}`;
    } catch {
      return '[Object]';
    }
  }

  return String(value);
};
