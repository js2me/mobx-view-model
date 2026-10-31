import { getCollectionKind } from '../inspection/collection-like';
import { createDatePreviewChildren } from '../inspection/create-date-preview-children';
import { getAllKeys } from '../inspection/get-all-keys';
import { isInaccessible } from '../inspection/safe-access';
import {
  type SortPropertiesBy,
  sortPropertyListItems,
} from '../inspection/sort-property-keys';
import type { ListItem } from './list-item';
import { PropertyListItem } from './property-list-item';

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
  if (kind) {
    let index = 0;
    for (const _ of data.values()) {
      entries.push(
        PropertyListItem.create(
          inspector,
          String(index),
          `${path}[${index}]`,
          index,
          parent,
          { collectionEntryKind: kind, collectionEntryIndex: index },
        ),
      );
      index++;
    }
  }
  const offset = previews.length + entries.length;
  const members = getAllKeys(data).map((key, order) =>
    createMember(key, order + offset),
  );
  return [...previews, ...entries, ...sortPropertyListItems(members, sort)];
}
