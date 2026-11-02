import { computed, type IComputedValue } from 'mobx';
import { getCollectionKind } from './collection-like';
import type { MapLike } from './mobx-collection';

type MapOwner = { readonly data: unknown };
const indexes = new WeakMap<object, IComputedValue<unknown[]>>();

/** Index keys once while observed; value-only edits keep the index intact. */
export function getMapEntryKeys(parent: MapOwner): readonly unknown[] {
  let index = indexes.get(parent);
  if (!index) {
    index = computed(() => {
      const data = parent.data;
      return getCollectionKind(data) === 'map'
        ? [...(data as MapLike).keys()]
        : [];
    });
    indexes.set(parent, index);
  }
  return index.get();
}

export function getIndexedMapEntryAt(
  parent: MapOwner,
  index: number,
): [unknown, unknown] | undefined {
  const keys = getMapEntryKeys(parent);
  if (index < 0 || index >= keys.length) return undefined;
  const key = keys[index];
  return [key, (parent.data as MapLike).get(key)];
}
