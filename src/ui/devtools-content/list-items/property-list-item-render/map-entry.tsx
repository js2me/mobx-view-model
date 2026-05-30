import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import { formatCollectionKey } from '@/model/utils/format-collection-key';
import { CollectionMeta, CollectionTypedValue } from './collection-typed-value';
import {
  getNestedValueExpandedOpen,
  getNestedValuePreview,
} from './format-collection-inspector-value';
import { PropertyValueEditInput } from './property-value-edit-input';
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
        {item.editor.isEditMode ? (
          <span className={css.propertyValue}>
            <PropertyValueEditInput item={item} />
          </span>
        ) : valueIsStructuralOpen ? (
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
