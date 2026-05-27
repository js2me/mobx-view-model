import { getConstructorName, isInaccessible } from './safe-access';

export function formatArrayInlineElement(value: unknown): string {
  if (isInaccessible(value)) {
    return '<Inaccessible>';
  }

  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'bigint') {
    return `${String(value)}n`;
  }

  if (typeof value === 'symbol') {
    return String(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : '[...]';
  }

  if (typeof value === 'function') {
    const name = value.name || 'anonymous';
    return `ƒ ${name}()`;
  }

  if (typeof value === 'object') {
    const constructorName = getConstructorName(value);
    if (constructorName && constructorName !== 'Object') {
      return constructorName;
    }

    return '{...}';
  }

  return String(value);
}

export function formatArrayInlinePreview(
  array: readonly unknown[],
  visibleCount = array.length,
): string {
  return formatArrayInlinePreviewFromElements(
    getArrayInlinePreviewElements(array),
    visibleCount,
  );
}

export function formatArrayInlinePreviewFromElements(
  elements: readonly string[],
  visibleCount = elements.length,
): string {
  if (elements.length === 0) {
    return '[]';
  }

  const count = Math.max(0, Math.min(visibleCount, elements.length));
  const hasMore = count < elements.length;

  return `[${elements.slice(0, count).join(', ')}${hasMore ? ', ...' : ''}]`;
}

export function getArrayInlinePreviewElements(array: readonly unknown[]): string[] {
  return array.map(formatArrayInlineElement);
}

let measureContext: CanvasRenderingContext2D | null = null;

export function measureInlineTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') {
    return text.length * 7;
  }

  measureContext ??= document.createElement('canvas').getContext('2d');

  if (!measureContext) {
    return text.length * 7;
  }

  measureContext.font = font;
  return measureContext.measureText(text).width;
}

export function getVisibleArrayInlineCount(
  elements: readonly string[],
  availableWidth: number,
  font: string,
): number {
  if (elements.length === 0) {
    return 0;
  }

  if (availableWidth <= 0) {
    return 0;
  }

  for (let count = elements.length; count >= 1; count--) {
    const text = formatArrayInlinePreviewFromElements(elements, count);

    if (measureInlineTextWidth(text, font) <= availableWidth) {
      return count;
    }
  }

  return measureInlineTextWidth(
    formatArrayInlinePreviewFromElements(elements, 1),
    font,
  ) <= availableWidth
    ? 1
    : 0;
}
