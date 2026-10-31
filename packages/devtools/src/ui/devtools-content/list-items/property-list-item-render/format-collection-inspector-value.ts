import type { PropertyListItem } from '@/model/list-item/property-list-item';
import { formatArrayInlinePreview } from '@/model/utils/format-array-inline-preview';
import { formatObjectInlinePreview } from '@/model/utils/format-object-inline-preview';

export function getNestedValuePreview(item: PropertyListItem): string {
  switch (item.nestedValueType) {
    case 'array':
      return Array.isArray(item.data)
        ? formatArrayInlinePreview(item.data)
        : item.isExpandable
          ? '[...]'
          : '[]';
    case 'object':
      return item.data && typeof item.data === 'object'
        ? formatObjectInlinePreview(item.data)
        : item.isExpandable
          ? '{...}'
          : '{}';
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
