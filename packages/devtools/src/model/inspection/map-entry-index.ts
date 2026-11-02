import { computed, createAtom } from 'mobx';
import {
  getCollectionKind,
  getMapEntryAt,
  isMobxObservableMap,
} from './collection-like';
import type { MapLike } from './mobx-collection';

type MapOwner = { readonly data: unknown };
class MapEntryIndex {
  // reportObserved() also tells us whether a read can retain a computed cache.
  readonly reads = createAtom('Map entry rows');
  nativeMap?: MapLike;
  nativeKeys?: readonly unknown[];
  readonly keys = computed(() => {
    const data = this.parent.data;
    return getCollectionKind(data) === 'map'
      ? [...(data as MapLike).keys()]
      : [];
  });
  constructor(readonly parent: MapOwner) {}
}
const indexes = new WeakMap<object, MapEntryIndex>();

function getIndex(parent: MapOwner) {
  let index = indexes.get(parent);
  if (!index) {
    index = new MapEntryIndex(parent);
    indexes.set(parent, index);
  }
  return index;
}

/** Index keys once while observed; value-only edits keep the index intact. */
export function getMapEntryKeys(parent: MapOwner): readonly unknown[] {
  const data = parent.data;
  if (getCollectionKind(data) !== 'map') return [];
  const index = getIndex(parent);
  if (isMobxObservableMap(data)) return index.keys.get();

  // Plain Maps have no structural atom. Rebuilding children must read live
  // keys and invalidate already-observed positional rows when keys change.
  const keys = [...(data as MapLike).keys()];
  const previous = index.nativeKeys;
  index.nativeMap = data as MapLike;
  index.nativeKeys = keys;
  if (
    previous &&
    (previous.length !== keys.length ||
      previous.some((key, position) => !Object.is(key, keys[position])))
  ) {
    index.reads.reportChanged();
  }
  return keys;
}

export function getIndexedMapEntryAt(
  parent: MapOwner,
  index: number,
): [unknown, unknown] | undefined {
  const data = parent.data;
  if (index < 0 || getCollectionKind(data) !== 'map') return undefined;
  const cache = getIndex(parent);
  const tracked = cache.reads.reportObserved();
  if (!tracked) return getMapEntryAt(data as MapLike, index);

  const keys = isMobxObservableMap(data)
    ? cache.keys.get()
    : cache.nativeMap === data
      ? cache.nativeKeys
      : undefined;
  if (!keys) return getMapEntryAt(data as MapLike, index);
  if (index >= keys.length) return undefined;
  const key = keys[index];
  return [key, (data as MapLike).get(key)];
}
