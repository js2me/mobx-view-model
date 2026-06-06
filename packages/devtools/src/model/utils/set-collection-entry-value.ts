import { runInAction } from 'mobx';
import { getCollectionKind } from './collection-like';
import type { MapLike, SetLike } from './mobx-collection';

export type SetCollectionEntryResult =
  | { ok: true }
  | { ok: false; error: string };

type WritableMapLike = MapLike & {
  set(key: unknown, value: unknown): unknown;
};

type WritableSetLike = SetLike & {
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
    runInAction(() => {
      if (Object.is(oldValue, newValue)) {
        return;
      }

      if (!writableSet.delete(oldValue)) {
        throw new Error('Set entry was not found');
      }

      writableSet.add(newValue);
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: formatError(error) };
  }
}
