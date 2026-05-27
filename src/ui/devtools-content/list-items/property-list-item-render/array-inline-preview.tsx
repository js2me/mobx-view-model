import { observer } from 'mobx-react-lite';
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  formatArrayInlineElement,
  getArrayInlinePreviewElements,
  getVisibleArrayInlineCount,
} from '@/model/utils/format-array-inline-preview';
import { CollectionMeta, CollectionTypedValue } from './collection-typed-value';
import css from './styles.module.css';

const MAX_SCANNED_ITEMS = 256;

export const ArrayInlinePreview = observer(
  ({
    array,
    className,
  }: {
    array: readonly unknown[];
    className?: string;
  }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const [visibleCount, setVisibleCount] = useState(array.length);

    const scannedArray = useMemo(
      () => array.slice(0, MAX_SCANNED_ITEMS),
      [array],
    );
    const formattedElements = useMemo(
      () => getArrayInlinePreviewElements(scannedArray),
      [scannedArray],
    );

    useLayoutEffect(() => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const updateVisibleCount = () => {
        const style = getComputedStyle(container);
        const font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const nextCount = getVisibleArrayInlineCount(
          formattedElements,
          container.clientWidth,
          font,
        );

        setVisibleCount(nextCount);
      };

      updateVisibleCount();

      const resizeObserver = new ResizeObserver(updateVisibleCount);
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }, [formattedElements]);

    if (array.length === 0) {
      return (
        <span ref={containerRef} className={className}>
          <CollectionMeta>[]</CollectionMeta>
        </span>
      );
    }

    const count = Math.max(0, Math.min(visibleCount, scannedArray.length));
    const hasMore = count < array.length;

    if (count === 0) {
      return (
        <span ref={containerRef} className={className}>
          <CollectionMeta>[...]</CollectionMeta>
        </span>
      );
    }

    return (
      <span ref={containerRef} className={className}>
        <CollectionMeta>[</CollectionMeta>
        {scannedArray.slice(0, count).map((value, index) => (
          <Fragment key={index}>
            {index > 0 ? <CollectionMeta>{', '}</CollectionMeta> : null}
            <CollectionTypedValue value={value}>
              {formatArrayInlineElement(value)}
            </CollectionTypedValue>
          </Fragment>
        ))}
        {hasMore ? (
          <>
            <CollectionMeta>{', '}</CollectionMeta>
            <CollectionMeta>...</CollectionMeta>
          </>
        ) : null}
        <CollectionMeta>]</CollectionMeta>
      </span>
    );
  },
);
