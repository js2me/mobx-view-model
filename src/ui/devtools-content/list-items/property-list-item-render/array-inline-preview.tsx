import { observer } from 'mobx-react-lite';
import { Fragment, useMemo } from 'react';
import { cx } from 'yummies/css';
import {
  formatArrayInlineElement,
  getVisibleArrayInlineCount,
  prepareArrayInlinePreview,
  resolveArrayInlinePreviewSlice,
} from '@/model/utils/format-array-inline-preview';
import { CollectionMeta, CollectionTypedValue } from './collection-typed-value';
import { useInlinePreviewVisibleCount } from './use-inline-preview-visible-count';
import css from './styles.module.css';

export const ArrayInlinePreview = observer(
  ({
    array,
    className,
  }: {
    array: readonly unknown[];
    className?: string;
  }) => {
    const preview = useMemo(() => prepareArrayInlinePreview(array), [array]);
    const previewClassName = cx(css.inlinePreview, className);
    const { containerRef, visibleCount } = useInlinePreviewVisibleCount(
      preview.formattedElements,
      getVisibleArrayInlineCount,
      preview.totalCount,
    );
    const slice = resolveArrayInlinePreviewSlice(preview, visibleCount);

    if (slice.isEmpty) {
      return (
        <span ref={containerRef} className={previewClassName}>
          <CollectionMeta>[]</CollectionMeta>
        </span>
      );
    }

    if (slice.isOverflow) {
      return (
        <span ref={containerRef} className={previewClassName}>
          <CollectionMeta>[...]</CollectionMeta>
        </span>
      );
    }

    return (
      <span ref={containerRef} className={previewClassName}>
        <CollectionMeta>[</CollectionMeta>
        {slice.values.map((value, index) => (
          <Fragment key={index}>
            {index > 0 ? <CollectionMeta>{', '}</CollectionMeta> : null}
            <CollectionTypedValue value={value}>
              {formatArrayInlineElement(value)}
            </CollectionTypedValue>
          </Fragment>
        ))}
        {slice.hasMore ? (
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
