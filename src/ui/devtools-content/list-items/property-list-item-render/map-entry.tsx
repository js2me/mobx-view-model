import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';
import {
  formatCollectionKey,
  getNestedValueExpandedOpen,
  getNestedValuePreview,
} from './format-collection-inspector-value';

export const MapEntryPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const keyLabel = formatCollectionKey(item.mapEntryKey);
    const valuePart = item.isExpanded
      ? (getNestedValueExpandedOpen(item) ?? item.stringifiedData)
      : getNestedValuePreview(item);

    return (
      <>
        <span className={css.propertyName}>{item.property}</span>
        :&nbsp;
        <span className={css.propertyValue}>
          {'{ '}
          {keyLabel} =&gt; {valuePart}
          {!item.isExpanded && ' }'}
        </span>
      </>
    );
  },
);
