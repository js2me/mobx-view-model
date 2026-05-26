import { untracked } from 'mobx';
import { PropertyListItem } from '../list-item/property-list-item';
import { VMListItem } from '../list-item/vm-list-item';
import type { ListItem } from '../list-item/list-item';
import {
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

function isSameComputedSnapshot(
  computedValue: unknown,
  parentValue: unknown,
  editedKey: string,
): boolean {
  if (computedValue === parentValue) {
    return true;
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
    addCandidate(host, current.property, depth);

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

function buildProducerValue(
  item: PropertyListItem,
  parsed: unknown,
): unknown | null {
  const propertyKey = item.property;

  if (propertyKey == null) {
    return null;
  }

  if (item.type === 'object' || item.type === 'array') {
    return parsed;
  }

  const parentItem = item.parentListItem;

  if (!(parentItem instanceof PropertyListItem)) {
    return null;
  }

  const parentValue = parentItem.data;

  if (parentValue !== null && typeof parentValue === 'object') {
    if (Array.isArray(parentValue)) {
      const index = Number(propertyKey);

      if (!Number.isNaN(index)) {
        const nextArray = [...parentValue];
        nextArray[index] = parsed;
        return nextArray;
      }
    } else {
      return {
        ...(parentValue as Record<string, unknown>),
        [propertyKey]: parsed,
      };
    }
  }

  return null;
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

  const producerValue = buildProducerValue(item, parsed);

  if (producerValue == null) {
    return null;
  }

  const candidates = collectComputedProducerCandidates(
    parentItem,
    parentItem.data,
    propertyKey,
  );
  const producer = pickBestComputedProducerCandidate(candidates);

  if (!producer) {
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
