import type { ReactNode } from 'react';
import { cx } from 'yummies/css';
import { getInspectorValueType } from '@/model/utils/get-inspector-value-type';
import css from './styles.module.css';

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
