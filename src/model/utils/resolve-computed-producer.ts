import { PropertyListItem } from '../list-item/property-list-item';
import { VMListItem } from '../list-item/vm-list-item';
import type { ListItem } from '../list-item/list-item';
import {
  findMobxAdministration,
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

  const ownerHost = getPropertyOwnerHost(parentItem);
  const ownerKey = parentItem.property;

  if (!isMobxComputedProperty(ownerHost, ownerKey)) {
    return null;
  }

  if (item.type === 'object' || item.type === 'array') {
    return {
      host: ownerHost,
      key: ownerKey,
      value: parsed,
    };
  }

  const parentValue = parentItem.data;

  if (parentValue !== null && typeof parentValue === 'object') {
    if (Array.isArray(parentValue)) {
      const index = Number(propertyKey);

      if (!Number.isNaN(index)) {
        const nextArray = [...parentValue];
        nextArray[index] = parsed;

        return {
          host: ownerHost,
          key: ownerKey,
          value: nextArray,
        };
      }
    } else {
      return {
        host: ownerHost,
        key: ownerKey,
        value: {
          ...(parentValue as Record<string, unknown>),
          [propertyKey]: parsed,
        },
      };
    }
  }

  return null;
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
