import { untracked } from 'mobx';
import {
  getCollectionKind,
  isMobxObservableMap,
  isMobxObservableSet,
} from '../inspection/collection-like';
import { detectPropertyValueType } from '../inspection/detect-property-value-type';
import type { MapLike, SetLike } from '../inspection/mobx-collection';
import { PropertyListItem } from '../list-item/property-list-item';
import {
  hasMobxObject,
  isMobxComputedProperty,
  isObservableArrayOwner,
} from './mobx-edit-adapter';
import type { SetEntryIdentity } from './set-entry-identity';

export type ComputedProducerTarget = {
  host: object;
  key: string;
  value: unknown;
  identityUpdates?: SetEntryUpdate[];
};

type SetEntryUpdate = { entry: SetEntryIdentity; value: unknown };

type EditSegment =
  | { kind: 'property'; key: string }
  | { kind: 'map'; key: unknown }
  | { kind: 'set'; index: number; identity?: SetEntryIdentity };

function editSegment(item: PropertyListItem): EditSegment {
  if (item.collectionEntryKind === 'map') {
    return { kind: 'map', key: item.mapEntryKey };
  }
  if (item.collectionEntryKind === 'set') {
    return {
      kind: 'set',
      index: item.collectionEntryIndex!,
      identity: item.setEntryIdentity,
    };
  }
  return { kind: 'property', key: item.property! };
}

function applyNestedEdit(
  value: unknown,
  segments: EditSegment[],
  parsed: unknown,
  updates: SetEntryUpdate[],
): unknown {
  if (segments.length === 0) {
    return parsed;
  }

  const [segment, ...rest] = segments;
  if (segment.kind === 'map') {
    if (getCollectionKind(value) !== 'map')
      throw new Error('Map entry was not found');
    const next = new Map((value as MapLike).entries());
    if (!next.has(segment.key)) throw new Error('Map entry was not found');
    next.set(
      segment.key,
      applyNestedEdit(next.get(segment.key), rest, parsed, updates),
    );
    return next;
  }
  if (segment.kind === 'set') {
    if (getCollectionKind(value) !== 'set')
      throw new Error('Set entry was not found');
    const values = [...(value as SetLike).values()];
    if (segment.index < 0 || segment.index >= values.length)
      throw new Error('Set entry was not found');
    values[segment.index] = applyNestedEdit(
      values[segment.index],
      rest,
      parsed,
      updates,
    );
    const nextValue = values[segment.index];
    if (segment.identity)
      updates.push({ entry: segment.identity, value: nextValue });
    return new Set(values);
  }
  const head = segment.key;

  if (Array.isArray(value)) {
    // slice preserves sparse entries; copying enumerable properties keeps
    // custom keys (including an empty key) when editing another array member.
    const next = Object.assign(value.slice(), value);
    const nextValue = applyNestedEdit(
      Reflect.get(value, head),
      rest,
      parsed,
      updates,
    );
    if (!Reflect.set(next, head, nextValue)) {
      throw new Error(`Cannot update array property "${head}"`);
    }
    return next;
  }

  if (value !== null && typeof value === 'object') {
    return {
      ...(value as Record<string, unknown>),
      [head]: applyNestedEdit(
        (value as Record<string, unknown>)[head],
        rest,
        parsed,
        updates,
      ),
    };
  }

  if (rest.length === 0) {
    return parsed;
  }

  return value;
}

/**
 * Pin the nearest plain computed snapshot on the edited path. Observable
 * values are edited in place, retaining their owner's dependencies. If that
 * owner later creates a new value, its normal recomputation remains authoritative.
 */
export function resolveComputedProducerForEdit(
  item: PropertyListItem,
  parsed: unknown,
): ComputedProducerTarget | null {
  if (item.property == null) {
    return null;
  }

  const segments = [editSegment(item)];
  let current = item.parentListItem;

  while (current instanceof PropertyListItem && current.property != null) {
    if (
      hasMobxObject(current.data) ||
      isObservableArrayOwner(current.data) ||
      isMobxObservableMap(current.data) ||
      isMobxObservableSet(current.data)
    ) {
      return null;
    }

    // Class instances have methods and potentially private state. They are
    // shared owners, not plain snapshots that can be copied into an override.
    if (
      detectPropertyValueType(current.data) === 'instance' &&
      getCollectionKind(current.data) == null
    )
      return null;

    const host = current.parentListItem.data;
    const key = current.property;
    if (isMobxComputedProperty(host, key)) {
      const rootValue = untracked(() => Reflect.get(host, key));
      const updates: SetEntryUpdate[] = [];
      const value = applyNestedEdit(rootValue, segments, parsed, updates);
      return {
        host,
        key,
        value,
        ...(updates.length ? { identityUpdates: updates } : {}),
      };
    }

    // An observable field (including observable.ref) owns the value below it.
    // Editing that value must not pin a computed higher up the inspector tree.
    if (hasMobxObject(host)) {
      return null;
    }

    segments.unshift(editSegment(current));
    current = current.parentListItem;
  }

  return null;
}
