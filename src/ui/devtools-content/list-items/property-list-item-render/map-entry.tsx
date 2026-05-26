import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import { CollectionMeta, CollectionTypedValue } from './collection-typed-value';
import {
  formatCollectionKey,
  getNestedValueExpandedOpen,
  getNestedValuePreview,
} from './format-collection-inspector-value';
import css from './styles.module.css';

export const MapEntryPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const mapKey = item.mapEntryKey;
    const expandedOpen = getNestedValueExpandedOpen(item);
    const valuePart = item.isExpanded
      ? (expandedOpen ?? item.stringifiedData)
      : getNestedValuePreview(item);
    const valueIsStructuralOpen = item.isExpanded && expandedOpen != null;

    return (
      <>
        <span className={css.propertyName}>{item.property}</span>
        :&nbsp;
        <CollectionMeta>{'{ '}</CollectionMeta>
        <CollectionTypedValue value={mapKey}>
          {formatCollectionKey(mapKey)}
        </CollectionTypedValue>
        <CollectionMeta>{' => '}</CollectionMeta>
        {valueIsStructuralOpen ? (
          <CollectionMeta>{valuePart}</CollectionMeta>
        ) : (
          <CollectionTypedValue
            value={item.data}
            displayType={item.nestedValueType}
          >
            {valuePart}
          </CollectionTypedValue>
        )}
        {!item.isExpanded && <CollectionMeta>{' }'}</CollectionMeta>}
      </>
    );
  },
);
