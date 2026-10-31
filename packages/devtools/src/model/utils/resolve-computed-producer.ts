import { untracked } from 'mobx';
import { PropertyListItem } from '../list-item/property-list-item';
import { VMListItem } from '../list-item/vm-list-item';
import type { ListItem } from '../list-item/list-item';
import {
  ensureMobxPropertyAtomLoaded,
  findMobxAdministration,
  getMobxComputedPropertyKeys,
  isMobxComputedProperty,
} from './mobx-administration';

export type ComputedProducerTarget = {
  host: object;
  key: string;
  value: unknown;
};

function getPropertyOwnerHost(item: PropertyListItem): object {
  const parent: ListItem<any> = item.parentListItem;

  if (parent instanceof PropertyListItem || parent instanceof VMListItem) {
    return parent.data;
  }

  return parent.data;
}

type ComputedProducerCandidate = {
  host: object;
  key: string;
  depth: number;
};

function isLiveMobxEditHost(value: unknown): value is object {
  return !!value && typeof value === 'object' && !!findMobxAdministration(value);
}

function canEditPropertyDirectlyOnHost(host: object, propertyKey: string) {
  const adm = ensureMobxPropertyAtomLoaded(host, propertyKey);

  if (!adm) {
    return false;
  }

  return adm.values_.has(propertyKey);
}

function isSameComputedSnapshot(
  computedValue: unknown,
  parentValue: unknown,
  editedKey: string,
): boolean {
  if (computedValue === parentValue) {
    // @computedModel and similar patterns return the same live model instance;
    // nested edits must target that instance, not replace the parent computed.
    return !isLiveMobxEditHost(parentValue);
  }

  if (
    !computedValue ||
    !parentValue ||
    typeof computedValue !== 'object' ||
    typeof parentValue !== 'object' ||
    Array.isArray(computedValue) ||
    Array.isArray(parentValue)
  ) {
    return false;
  }

  const computedRecord = computedValue as Record<string, unknown>;
  const parentRecord = parentValue as Record<string, unknown>;
  const computedKeys = Object.keys(computedRecord);
  const parentKeys = Object.keys(parentRecord);

  if (
    computedKeys.length !== parentKeys.length ||
    !computedKeys.every((key) => parentKeys.includes(key))
  ) {
    return false;
  }

  return computedKeys.every(
    (key) => key === editedKey || Object.is(computedRecord[key], parentRecord[key]),
  );
}

function collectComputedProducerCandidates(
  parentItem: PropertyListItem,
  parentValue: unknown,
  editedKey: string,
): ComputedProducerCandidate[] {
  const candidates: ComputedProducerCandidate[] = [];
  const seen = new Set<string>();
  let current: ListItem<any> | null = parentItem;
  let depth = 0;

  const addCandidate = (host: object, key: string, candidateDepth: number) => {
    const id = `${host}:${String(key)}`;

    if (seen.has(id) || !isMobxComputedProperty(host, key)) {
      return;
    }

    seen.add(id);
    candidates.push({ host, key, depth: candidateDepth });
  };

  while (current instanceof PropertyListItem && current.property != null) {
    const host = getPropertyOwnerHost(current);

    if (!(depth === 0 && isLiveMobxEditHost(parentValue))) {
      addCandidate(host, current.property, depth);
    }

    for (const computedKey of getMobxComputedPropertyKeys(host)) {
      try {
        const computedValue = untracked(
          () => (host as Record<string, unknown>)[computedKey],
        );

        if (isSameComputedSnapshot(computedValue, parentValue, editedKey)) {
          addCandidate(host, computedKey, depth);
        }
      } catch {
        // Getter may throw while devtools still allow editing a fallback value.
      }
    }

    current = current.parentListItem;
    depth += 1;
  }

  return candidates;
}

function pickBestComputedProducerCandidate(
  candidates: ComputedProducerCandidate[],
): ComputedProducerCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => right.depth - left.depth)[0] ?? null;
}

function findProducerPropertyListItem(
  item: PropertyListItem,
  producer: ComputedProducerCandidate,
): PropertyListItem | null {
  let current: ListItem<any> | null = item.parentListItem;

  while (current instanceof PropertyListItem) {
    const host = getPropertyOwnerHost(current);

    if (host === producer.host && current.property === producer.key) {
      return current;
    }

    current = current.parentListItem;
  }

  return null;
}

function collectPathSegmentsFromProducer(
  producerItem: PropertyListItem,
  item: PropertyListItem,
): string[] | null {
  const replacesWholeValue = item.type === 'object' || item.type === 'array';

  if (producerItem === item && replacesWholeValue) {
    return [];
  }

  const segments: string[] = [];

  if (!replacesWholeValue) {
    if (item.property == null) {
      return null;
    }

    segments.unshift(item.property);
  }

  let current: PropertyListItem | null =
    item.parentListItem instanceof PropertyListItem ? item.parentListItem : null;

  while (current && current !== producerItem) {
    if (current.property == null) {
      return null;
    }

    segments.unshift(current.property);
    current =
      current.parentListItem instanceof PropertyListItem
        ? current.parentListItem
        : null;
  }

  if (current !== producerItem) {
    return null;
  }

  if (replacesWholeValue) {
    if (item.property == null) {
      return null;
    }

    segments.push(item.property);
  }

  return segments;
}

function applyNestedEdit(
  value: unknown,
  segments: string[],
  parsed: unknown,
): unknown {
  if (segments.length === 0) {
    return parsed;
  }

  const [head, ...rest] = segments;

  if (Array.isArray(value)) {
    const index = Number(head);

    if (Number.isNaN(index)) {
      return value;
    }

    const next = [...value];
    next[index] = applyNestedEdit(next[index], rest, parsed);
    return next;
  }

  if (value !== null && typeof value === 'object') {
    return {
      ...(value as Record<string, unknown>),
      [head]: applyNestedEdit(
        (value as Record<string, unknown>)[head],
        rest,
        parsed,
      ),
    };
  }

  if (rest.length === 0) {
    return parsed;
  }

  return value;
}

function buildProducerValueForComputed(
  item: PropertyListItem,
  parsed: unknown,
  producer: ComputedProducerCandidate,
): unknown | null {
  const producerItem = findProducerPropertyListItem(item, producer);

  if (!producerItem) {
    return null;
  }

  const pathSegments = collectPathSegmentsFromProducer(producerItem, item);

  if (pathSegments == null) {
    return null;
  }

  let rootValue: unknown;

  try {
    rootValue = untracked(
      () => (producer.host as Record<string, unknown>)[producer.key],
    );
  } catch {
    return null;
  }

  return applyNestedEdit(rootValue, pathSegments, parsed);
}

/**
 * When a property is edited on a plain object returned by a computed getter
 * (e.g. service.permissions.editDescription), mutating the snapshot does nothing —
 * the computed recreates the object on the next read. Pin the producer computed instead.
 */
export function resolveComputedProducerForEdit(
  item: PropertyListItem,
  parsed: unknown,
): ComputedProducerTarget | null {
  const propertyKey = item.property;

  if (propertyKey == null) {
    return null;
  }

  const parentItem = item.parentListItem;

  if (!(parentItem instanceof PropertyListItem) || parentItem.property == null) {
    return null;
  }

  const parentValue = parentItem.data;

  if (
    isLiveMobxEditHost(parentValue) &&
    canEditPropertyDirectlyOnHost(parentValue, propertyKey)
  ) {
    return null;
  }

  const candidates = collectComputedProducerCandidates(
    parentItem,
    parentValue,
    propertyKey,
  );
  const producer = pickBestComputedProducerCandidate(candidates);

  if (!producer) {
    return null;
  }

  const producerValue = buildProducerValueForComputed(item, parsed, producer);

  if (producerValue == null) {
    return null;
  }

  return {
    host: producer.host,
    key: producer.key,
    value: producerValue,
  };
}

export function findMobxComputedPropertyHost(
  object: object,
  key: string,
): { host: object; key: string } | null {
  const adm = findMobxAdministration(object);

  if (adm && isMobxComputedProperty(object, key)) {
    return { host: object, key };
  }

  return null;
}
