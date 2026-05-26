import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';
import {
  CollectionMeta,
  CollectionTypedValue,
} from './collection-typed-value';
import {
  getNestedValueExpandedOpen,
  getNestedValuePreview,
} from './format-collection-inspector-value';

export const SetEntryPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const expandedOpen = getNestedValueExpandedOpen(item);
    const valuePart = item.isExpanded
      ? (expandedOpen ?? item.stringifiedData)
      : getNestedValuePreview(item);
    const valueIsStructuralOpen =
      item.isExpanded && expandedOpen != null;

    return (
      <>
        <span className={css.propertyName}>{item.property}</span>
        :&nbsp;
        <CollectionMeta>{'{ '}</CollectionMeta>
        {valueIsStructuralOpen ? (
          <CollectionMeta>{valuePart}</CollectionMeta>
        ) : (
          <CollectionTypedValue value={item.data} displayType={item.nestedValueType}>
            {valuePart}
          </CollectionTypedValue>
        )}
        {!item.isExpanded && <CollectionMeta>{' }'}</CollectionMeta>}
      </>
    );
  },
);
