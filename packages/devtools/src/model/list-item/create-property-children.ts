import { getSetEntryIdentities } from '../editing/set-entry-identity';
import { getCollectionKind } from '../inspection/collection-like';
import { createDatePreviewChildren } from '../inspection/create-date-preview-children';
import { isDateLike } from '../inspection/date-like';
import { getAllKeys } from '../inspection/get-all-keys';
import { getMapEntryKeys } from '../inspection/map-entry-index';
import { isInaccessible } from '../inspection/safe-access';
import {
  type SortPropertiesBy,
  sortPropertyListItems,
} from '../inspection/sort-property-keys';
import type { ListItem } from './list-item';
import { PropertyListItem } from './property-list-item';

/** Expansion affordances do not need to allocate a child model for every key. */
export function hasPropertyChildren(data: unknown, type: string): boolean {
  if (data == null || isInaccessible(data)) return false;
  if (type === 'array') return true; // Even an empty array exposes length.
  if (type === 'function') return Object.keys(data).length > 0;
  if (type !== 'object' && type !== 'instance') return false;
  if (isDateLike(data)) return true;
  if (getCollectionKind(data) && (data as { readonly size: number }).size > 0)
    return true;
  return getAllKeys(data).length > 0;
}

export function createPropertyChildren(
  parent: ListItem<any>,
  path: string,
  sort: SortPropertiesBy,
  type: string,
): PropertyListItem[] {
  const data = parent.data;
  if (data == null || isInaccessible(data)) return [];
  const inspector = parent.inspector;
  const createMember = (property: string, order: number) =>
    PropertyListItem.create(
      inspector,
      property,
      `${path}.${property}`,
      order,
      parent,
    );
  if (type === 'array')
    return sortPropertyListItems(
      [...Object.keys(data), 'length'].map(createMember),
      sort,
    );
  if (type === 'function')
    return sortPropertyListItems(Object.keys(data).map(createMember), sort);
  if (type !== 'object' && type !== 'instance') return [];

  const previews = createDatePreviewChildren(inspector, parent, path, data);
  const entries: PropertyListItem[] = [];
  const kind = getCollectionKind(data);
  if (kind === 'set') {
    for (const [index, identity] of getSetEntryIdentities(parent).entries()) {
      entries.push(
        PropertyListItem.create(
          inspector,
          String(index),
          `${path}[${index}]`,
          index,
          parent,
          {
            collectionEntryKind: kind,
            collectionEntryIndex: index,
            setEntryIdentity: identity,
          },
        ),
      );
    }
  } else if (kind === 'map') {
    for (const index of getMapEntryKeys(parent).keys()) {
      entries.push(
        PropertyListItem.create(
          inspector,
          String(index),
          `${path}[${index}]`,
          index,
          parent,
          {
            collectionEntryKind: kind,
            collectionEntryIndex: index,
          },
        ),
      );
    }
  }
  const offset = previews.length + entries.length;
  const members = getAllKeys(data).map((key, order) =>
    createMember(key, order + offset),
  );
  return [...previews, ...entries, ...sortPropertyListItems(members, sort)];
}
