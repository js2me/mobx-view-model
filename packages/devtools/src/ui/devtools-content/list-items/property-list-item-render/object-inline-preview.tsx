import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { cx } from 'yummies/css';
import { formatArrayInlineElement } from '@/model/inspection/format-array-inline-preview';
import {
  getVisibleObjectInlineCount,
  type ObjectInlineEntry,
  prepareObjectInlinePreview,
  resolveObjectInlinePreviewSlice,
} from '@/model/inspection/format-object-inline-preview';
import { CollectionMeta, CollectionTypedValue } from './collection-typed-value';
import css from './styles.module.css';
import { useInlinePreviewVisibleCount } from './use-inline-preview-visible-count';

export const ObjectInlinePreview = observer(
  ({ object, className }: { object: object; className?: string }) => {
    const previewClassName = cx(css.inlinePreview, className);
    const preview = useMemo(() => prepareObjectInlinePreview(object), [object]);
    const { containerRef, visibleCount } = useInlinePreviewVisibleCount(
      preview.formattedElements,
      getVisibleObjectInlineCount,
      preview.totalCount,
    );
    const slice = resolveObjectInlinePreviewSlice(preview, visibleCount);

    if (slice.isEmpty) {
      return (
        <span ref={containerRef} className={previewClassName}>
          <CollectionMeta>{'{}'}</CollectionMeta>
        </span>
      );
    }

    if (slice.isOverflow) {
      return (
        <span ref={containerRef} className={previewClassName}>
          <CollectionMeta>{'{...}'}</CollectionMeta>
        </span>
      );
    }

    return (
      <span ref={containerRef} className={previewClassName}>
        <CollectionMeta>{'{'}</CollectionMeta>
        {slice.entries.map((entry, index) => (
          <ObjectInlinePreviewEntry
            key={entry.key}
            entry={entry}
            withCommaPrefix={index > 0}
          />
        ))}
        {slice.hasMore ? (
          <>
            <CollectionMeta>{', '}</CollectionMeta>
            <CollectionMeta>...</CollectionMeta>
          </>
        ) : null}
        <CollectionMeta>{'}'}</CollectionMeta>
      </span>
    );
  },
);

const ObjectInlinePreviewEntry = ({
  entry,
  withCommaPrefix,
}: {
  entry: ObjectInlineEntry;
  withCommaPrefix: boolean;
}) => {
  return (
    <>
      {withCommaPrefix ? <CollectionMeta>{', '}</CollectionMeta> : null}
      <span className={css.propertyName}>{entry.key}</span>
      <CollectionMeta>: </CollectionMeta>
      <CollectionTypedValue value={entry.value}>
        {formatArrayInlineElement(entry.value)}
      </CollectionTypedValue>
    </>
  );
};
