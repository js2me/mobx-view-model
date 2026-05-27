import type { PropertyListItem } from '@/model/list-item/property-list-item';
import { formatArrayInlinePreview } from '@/model/utils/format-array-inline-preview';

export function formatCollectionKey(key: unknown): string {
  if (typeof key === 'string') {
    return `"${key}"`;
  }

  if (typeof key === 'symbol') {
    return String(key);
  }

  if (key === null) {
    return 'null';
  }

  if (key === undefined) {
    return 'undefined';
  }

  if (typeof key === 'object') {
    return '{...}';
  }

  return String(key);
}

export function getNestedValuePreview(item: PropertyListItem): string {
  switch (item.nestedValueType) {
    case 'array':
      return Array.isArray(item.data)
        ? formatArrayInlinePreview(item.data)
        : item.isExpandable
          ? '[...]'
          : '[]';
    case 'object':
      return item.isExpandable ? '{...}' : '{}';
    case 'instance':
      return item.isExpandable ? '{...}' : item.instanceClassName;
    case 'function':
      return item.instanceClassName;
    default:
      return item.stringifiedData;
  }
}

export function getNestedValueExpandedOpen(item: PropertyListItem): string | null {
  switch (item.nestedValueType) {
    case 'array':
      return '[';
    case 'object':
    case 'instance':
      return '{';
    default:
      return null;
  }
}
