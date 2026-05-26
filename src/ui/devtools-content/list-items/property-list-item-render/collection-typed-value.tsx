import type { ReactNode } from 'react';
import { cx } from 'yummies/css';
import css from './styles.module.css';

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
    if (value.constructor?.name && value.constructor.name !== 'Object') {
      return 'instance';
    }

    return 'object';
  }

  return typeof value;
}

export function getTypedValueClassName(
  value: unknown,
  displayType?: string,
): string {
  const type = displayType ?? getInspectorValueType(value);

  switch (type) {
    case 'string':
      return css.string;
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'symbol':
      return css.primitive;
    case 'null':
    case 'undefined':
      return css.nullish;
    case 'instance':
      return css.instance;
    case 'array':
      return css.array;
    case 'object':
      return css.object;
    case 'function':
      return css.function;
    default:
      return css.primitive;
  }
}

export function CollectionTypedValue({
  value,
  displayType,
  children,
}: {
  value?: unknown;
  displayType?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        css.typedValue,
        getTypedValueClassName(value, displayType),
      )}
    >
      {children}
    </span>
  );
}

export function CollectionMeta({ children }: { children: ReactNode }) {
  return <span className={css.collectionMeta}>{children}</span>;
}
