import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';
import { PropertyValueEditInput } from './property-value-edit-input';

export const ArrayPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    return (
      <>
        {item.property === undefined ? null : (
          <>
            <span className={css.propertyName}>{item.property}</span>
            :&nbsp;
          </>
        )}
        <span className={css.propertyValue}>
          {item.isEditMode ? (
            <PropertyValueEditInput item={item} />
          ) : item.isExpanded ? (
            '['
          ) : item.isExpandable ? (
            '[...]'
          ) : (
            `[]`
          )}
        </span>
      </>
    );
  },
);
