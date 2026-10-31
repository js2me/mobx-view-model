import {
  isMobxObservableMap,
  isMobxObservableSet,
  isNativeMap,
  isNativeSet,
  type MapLike,
  type SetLike,
} from './mobx-collection';

export type CollectionKind = 'map' | 'set';

export function isMapLike(value: unknown): value is MapLike {
  return isNativeMap(value) || isMobxObservableMap(value);
}

export function isSetLike(value: unknown): value is SetLike {
  return isNativeSet(value) || isMobxObservableSet(value);
}

export function getCollectionKind(value: unknown): CollectionKind | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (isMapLike(value)) {
    return 'map';
  }

  if (isSetLike(value)) {
    return 'set';
  }

  return null;
}

export function getMapEntryAt(
  map: MapLike,
  index: number,
): [unknown, unknown] | undefined {
  let currentIndex = 0;

  for (const entry of map.entries()) {
    if (currentIndex === index) {
      return entry;
    }

    currentIndex++;
  }

  return undefined;
}

export function getSetValueAt(set: SetLike, index: number): unknown {
  let currentIndex = 0;

  for (const value of set.values()) {
    if (currentIndex === index) {
      return value;
    }

    currentIndex++;
  }

  return undefined;
}

export { isMobxObservableMap, isMobxObservableSet } from './mobx-collection';
