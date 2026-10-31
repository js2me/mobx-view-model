import { measureInlineTextWidth } from '@/model/utils/format-array-inline-preview';

export function getAvailableInlinePreviewWidth(element: HTMLElement): number {
  const parent = element.parentElement;

  if (!parent) {
    return element.clientWidth;
  }

  const parentWidth = parent.clientWidth;

  if (parentWidth <= 0) {
    return element.clientWidth;
  }

  const font = getInlinePreviewFont(element);
  let occupiedWidth = 0;

  for (const node of parent.childNodes) {
    if (node === element) {
      continue;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;

      if (text) {
        occupiedWidth += measureInlineTextWidth(text, font);
      }

      continue;
    }

    if (node instanceof HTMLElement) {
      occupiedWidth += node.getBoundingClientRect().width;
    }
  }

  return Math.max(0, parentWidth - occupiedWidth);
}

export function getInlinePreviewFont(element: HTMLElement): string {
  const style = getComputedStyle(element);

  return `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}
