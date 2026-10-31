import { getAllKeys } from './get-all-keys';
import {
  formatArrayInlineElement,
  formatArrayInlinePreviewFromElements,
  getArrayInlinePreviewElements,
  getVisibleInlinePreviewCount,
  measureInlineTextWidth,
} from './format-array-inline-preview';
import {
  INLINE_PREVIEW_MAX_ITEMS,
  resolveInlinePreviewSlice,
  type InlinePreviewSlice,
} from './inline-preview';

export type { InlinePreviewSlice };

export type ObjectInlineEntry = {
  key: string;
  value: unknown;
};

export type ObjectInlinePreviewModel = {
  totalCount: number;
  scannedEntries: ObjectInlineEntry[];
  formattedElements: string[];
};

export function getObjectInlinePreviewEntries(
  object: object,
): ObjectInlineEntry[] {
  return getAllKeys(object).map((key) => ({
    key,
    value: (object as Record<string, unknown>)[key],
  }));
}

export function prepareObjectInlinePreview(
  object: object,
): ObjectInlinePreviewModel {
  const entries = getObjectInlinePreviewEntries(object);
  const scannedEntries = entries.slice(0, INLINE_PREVIEW_MAX_ITEMS);

  return {
    totalCount: entries.length,
    scannedEntries,
    formattedElements: scannedEntries.map(formatObjectInlineEntry),
  };
}

export function resolveObjectInlinePreviewSlice(
  model: ObjectInlinePreviewModel,
  visibleCount: number,
): InlinePreviewSlice & { entries: ObjectInlineEntry[] } {
  const slice = resolveInlinePreviewSlice(
    visibleCount,
    model.scannedEntries.length,
    model.totalCount,
  );

  return {
    ...slice,
    entries: model.scannedEntries.slice(0, slice.count),
  };
}

export function formatObjectInlineEntry(entry: ObjectInlineEntry): string {
  return `${entry.key}: ${formatArrayInlineElement(entry.value)}`;
}

export function getObjectInlinePreviewElements(
  object: object,
): string[] {
  return getObjectInlinePreviewEntries(object).map(formatObjectInlineEntry);
}

export function formatObjectInlinePreview(
  object: object,
  visibleCount?: number,
): string {
  return formatObjectInlinePreviewFromElements(
    getObjectInlinePreviewElements(object),
    visibleCount,
  );
}

export function formatObjectInlinePreviewFromElements(
  elements: readonly string[],
  visibleCount = elements.length,
): string {
  if (elements.length === 0) {
    return '{}';
  }

  const count = Math.max(0, Math.min(visibleCount, elements.length));
  const hasMore = count < elements.length;

  return `{${elements.slice(0, count).join(', ')}${hasMore ? ', ...' : ''}}`;
}

export function getVisibleObjectInlineCount(
  elements: readonly string[],
  availableWidth: number,
  font: string,
): number {
  return getVisibleInlinePreviewCount(
    elements,
    availableWidth,
    font,
    formatObjectInlinePreviewFromElements,
  );
}

export { measureInlineTextWidth };
