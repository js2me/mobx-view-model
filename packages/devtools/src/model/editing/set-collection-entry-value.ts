import { runInAction } from 'mobx';
import { getCollectionKind } from '../inspection/collection-like';
import type { MapLike, SetLike } from '../inspection/mobx-collection';

export type SetCollectionEntryResult =
  | { ok: true; value?: unknown }
  | { ok: false; error: string };

type WritableMapLike = MapLike & {
  set(key: unknown, value: unknown): unknown;
};

type WritableSetLike = SetLike & {
  readonly size: number;
  has(value: unknown): boolean;
  delete(value: unknown): boolean;
  add(value: unknown): unknown;
};

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function setMapEntryValue(
  map: unknown,
  key: unknown,
  value: unknown,
): SetCollectionEntryResult {
  if (getCollectionKind(map) !== 'map') {
    return { ok: false, error: 'Parent value is not a Map or ObservableMap' };
  }

  if (typeof (map as WritableMapLike).set !== 'function') {
    return { ok: false, error: 'Map does not support set()' };
  }

  try {
    runInAction(() => {
      (map as WritableMapLike).set(key, value);
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: formatError(error) };
  }
}

export function setSetEntryValue(
  set: unknown,
  oldValue: unknown,
  newValue: unknown,
): SetCollectionEntryResult {
  if (getCollectionKind(set) !== 'set') {
    return { ok: false, error: 'Parent value is not a Set or ObservableSet' };
  }

  const writableSet = set as WritableSetLike;

  if (
    typeof writableSet.delete !== 'function' ||
    typeof writableSet.add !== 'function'
  ) {
    return { ok: false, error: 'Set does not support delete() and add()' };
  }

  try {
    let actualValue = newValue;
    runInAction(() => {
      if (!writableSet.has(oldValue))
        throw new Error('Set entry was not found');
      if (Object.is(oldValue, newValue) || oldValue === newValue) return;
      const existed = writableSet.has(newValue);
      const previousSize = writableSet.size;
      writableSet.add(newValue);
      // ObservableSet may enhance an object into an observable proxy.
      if (!existed) {
        if (writableSet.size === previousSize)
          throw new Error('Set rejected the new value');
        if (!writableSet.has(newValue)) {
          for (const value of writableSet.values()) actualValue = value;
        }
      }
      if (!writableSet.delete(oldValue)) {
        if (!existed && !writableSet.delete(actualValue)) {
          throw new Error(
            'Set rejected removal and rollback; both the old and new values were retained',
          );
        }
        throw new Error('Set rejected removal of the old value');
      }
    });
    return { ok: true, value: actualValue };
  } catch (error) {
    return { ok: false, error: formatError(error) };
  }
}
