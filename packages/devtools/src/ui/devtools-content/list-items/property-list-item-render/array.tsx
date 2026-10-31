import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import { ArrayInlinePreview } from './array-inline-preview';
import { PropertyValueEditInput } from './property-value-edit-input';
import css from './styles.module.css';

export const ArrayPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const array = Array.isArray(item.data) ? item.data : [];

    return (
      <>
        {item.property === undefined ? null : (
          <>
            <span className={css.propertyName}>{item.property}</span>
            :&nbsp;
          </>
        )}
        {item.editor?.isEditMode ? (
          <span className={css.propertyValue}>
            <PropertyValueEditInput item={item} />
          </span>
        ) : item.isExpanded ? (
          <span className={css.propertyValue}>[</span>
        ) : item.isExpandable ? (
          <ArrayInlinePreview array={array} className={css.propertyValue} />
        ) : (
          <span className={css.propertyValue}>[]</span>
        )}
      </>
    );
  },
);
