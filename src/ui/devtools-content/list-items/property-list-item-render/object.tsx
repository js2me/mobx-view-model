import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import { ObjectInlinePreview } from './object-inline-preview';
import css from './styles.module.css';
import { PropertyValueEditInput } from './property-value-edit-input';

export const ObjectPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const object =
      item.data && typeof item.data === 'object' ? item.data : null;

    return (
      <>
        {item.property === undefined ? null : (
          <>
            <span className={css.propertyName}>{item.property}</span>
            :&nbsp;
          </>
        )}
        {item.isEditMode ? (
          <span className={css.propertyValue}>
            <PropertyValueEditInput item={item} />
          </span>
        ) : item.isExpanded ? (
          <span className={css.propertyValue}>{'{'}</span>
        ) : item.isExpandable && object ? (
          <ObjectInlinePreview object={object} className={css.propertyValue} />
        ) : (
          <span className={css.propertyValue}>{'{}'}</span>
        )}
      </>
    );
  },
);
