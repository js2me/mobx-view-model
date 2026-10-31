import type { ViewModelDevtools } from '../view-model-devtools';

export type SortPropertiesBy = ViewModelDevtools['sortPropertiesBy'];

type SortablePropertyListItem = {
  property: unknown;
};

export function comparePropertyNames(
  left: string,
  right: string,
  sortBy: SortPropertiesBy,
): number {
  if (sortBy === 'asc') {
    return left.localeCompare(right);
  }

  if (sortBy === 'desc') {
    return right.localeCompare(left);
  }

  return 0;
}

export function sortPropertyKeys(
  keys: string[],
  sortBy: SortPropertiesBy,
): string[] {
  if (sortBy === 'none') {
    return keys;
  }

  return [...keys].sort((left, right) =>
    comparePropertyNames(left, right, sortBy),
  );
}

export function sortPropertyListItems<T extends SortablePropertyListItem>(
  items: T[],
  sortBy: SortPropertiesBy,
): T[] {
  if (sortBy === 'none') {
    return items;
  }

  return [...items].sort((left, right) =>
    comparePropertyNames(String(left.property), String(right.property), sortBy),
  );
}
