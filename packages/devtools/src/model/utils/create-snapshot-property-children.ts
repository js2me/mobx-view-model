import type { ListItem } from '../list-item/list-item';
import { PropertyListItem } from '../list-item/property-list-item';
import type { ViewModelDevtools } from '../view-model-devtools';
import { createDatePreviewChildren } from './create-date-preview-children';
import {
  getCollectionKind,
  type CollectionKind,
} from './collection-like';
import { getAllKeys } from './get-all-keys';
import { isInaccessible } from './safe-access';
import { sortPropertyListItems } from './sort-property-keys';

const createCollectionEntryChildren = (
  devtools: ViewModelDevtools,
  parent: ListItem<any>,
  path: string,
  data: unknown,
): PropertyListItem[] => {
  const collectionKind = getCollectionKind(data);

  if (collectionKind === 'map') {
    const items: PropertyListItem[] = [];
    let index = 0;

    for (const _ of (data as Map<unknown, unknown>).entries()) {
      items.push(
        PropertyListItem.create(
          devtools,
          String(index),
          `${path}[${index}]`,
          index,
          parent,
          {
            collectionEntryKind: 'map',
            collectionEntryIndex: index,
          },
        ),
      );
      index++;
    }

    return items;
  }

  if (collectionKind === 'set') {
    const items: PropertyListItem[] = [];
    let index = 0;

    for (const _ of (data as Set<unknown>).values()) {
      items.push(
        PropertyListItem.create(
          devtools,
          String(index),
          `${path}[${index}]`,
          index,
          parent,
          {
            collectionEntryKind: 'set',
            collectionEntryIndex: index,
          },
        ),
      );
      index++;
    }

    return items;
  }

  return [];
};

const createChildrenForNestedValue = (
  devtools: ViewModelDevtools,
  parent: ListItem<any>,
  path: string,
  data: unknown,
): PropertyListItem[] => {
  if (isInaccessible(data)) {
    return [];
  }

  if (Array.isArray(data)) {
    const listItems = Object.keys(data).map((property, order) =>
      PropertyListItem.create(
        devtools,
        property,
        `${path}.${property}`,
        order,
        parent,
      ),
    );

    listItems.push(
      PropertyListItem.create(
        devtools,
        'length',
        `${path}.length`,
        listItems.length,
        parent,
      ),
    );

    return listItems;
  }

  if (typeof data === 'function') {
    return Object.keys(data).map((property, order) =>
      PropertyListItem.create(
        devtools,
        property,
        `${path}.${property}`,
        order,
        parent,
      ),
    );
  }

  if (data && typeof data === 'object') {
    return getAllKeys(data).map((property, order) =>
      PropertyListItem.create(
        devtools,
        property,
        `${path}.${property}`,
        order,
        parent,
      ),
    );
  }

  return [];
};

export const createSnapshotPropertyChildren = (
  devtools: ViewModelDevtools,
  parent: ListItem<any>,
  path: string,
  sortPropertiesBy: ViewModelDevtools['sortPropertiesBy'],
  valueType: string,
  collectionEntryKind?: CollectionKind,
): PropertyListItem[] => {
  const data = parent.data;

  if (collectionEntryKind != null) {
    return sortPropertyListItems(
      createChildrenForNestedValue(devtools, parent, path, data),
      sortPropertiesBy,
    );
  }

  if (valueType === 'array') {
    return sortPropertyListItems(
      createChildrenForNestedValue(devtools, parent, path, data),
      sortPropertiesBy,
    );
  }

  if (valueType === 'function') {
    return createChildrenForNestedValue(devtools, parent, path, data);
  }

  if (valueType === 'instance' || valueType === 'object') {
    const datePreviewItems = createDatePreviewChildren(
      devtools,
      parent,
      path,
      data,
    );
    const entryItems = createCollectionEntryChildren(
      devtools,
      parent,
      path,
      data,
    );
    const memberItems = sortPropertyListItems(
      getAllKeys(data).map((property, order) =>
        PropertyListItem.create(
          devtools,
          property,
          `${path}.${property}`,
          order + datePreviewItems.length + entryItems.length,
          parent,
        ),
      ),
      sortPropertiesBy,
    );

    return [...datePreviewItems, ...entryItems, ...memberItems];
  }

  return [];
};
