import { INACCESSIBLE, isInaccessible } from './safe-access';

export type PropertyValueSnapshot =
  | null
  | undefined
  | boolean
  | number
  | string
  | bigint
  | symbol
  | typeof INACCESSIBLE
  | object
  | ((...args: unknown[]) => unknown);

export const createPropertyValueSnapshot = (
  value: unknown,
): PropertyValueSnapshot => {
  if (isInaccessible(value)) {
    return INACCESSIBLE;
  }

  if (value === null || value === undefined) {
    return value;
  }

  const valueType = typeof value;

  if (
    valueType === 'object' ||
    valueType === 'function' ||
    valueType === 'symbol' ||
    valueType === 'bigint'
  ) {
    return value as PropertyValueSnapshot;
  }

  return value as PropertyValueSnapshot;
};

export const arePropertyValueSnapshotsEqual = (
  left: PropertyValueSnapshot | undefined,
  right: PropertyValueSnapshot,
) => Object.is(left, right);
