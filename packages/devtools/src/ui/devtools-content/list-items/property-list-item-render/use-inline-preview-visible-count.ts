import { useLayoutEffect, useRef, useState } from 'react';
import {
  getAvailableInlinePreviewWidth,
  getInlinePreviewFont,
} from './inline-preview-layout';

type ResolveVisibleCount = (
  elements: readonly string[],
  availableWidth: number,
  font: string,
) => number;

export function useInlinePreviewVisibleCount(
  formattedElements: readonly string[],
  resolveVisibleCount: ResolveVisibleCount,
  initialCount: number,
) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(initialCount);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updateVisibleCount = () => {
      const availableWidth = getAvailableInlinePreviewWidth(container);
      const font = getInlinePreviewFont(container);

      setVisibleCount(
        resolveVisibleCount(formattedElements, availableWidth, font),
      );
    };

    updateVisibleCount();

    const resizeObserver = new ResizeObserver(updateVisibleCount);
    resizeObserver.observe(container);

    const parent = container.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    const row = parent?.parentElement;
    if (row) {
      resizeObserver.observe(row);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [formattedElements, resolveVisibleCount]);

  return { containerRef, visibleCount };
}
