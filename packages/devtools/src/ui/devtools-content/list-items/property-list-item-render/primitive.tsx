import { observer } from 'mobx-react-lite';
import { INACCESSIBLE_DISPLAY_LABEL } from '@/model/inspection/safe-access';
import type { PropertyListItemRenderProps } from '.';
import { PropertyValueEditInput } from './property-value-edit-input';
import css from './styles.module.css';

export const PrimitivePropertyContent = observer(
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
          {item.editor?.isEditMode ? (
            <PropertyValueEditInput item={item} />
          ) : item.isInaccessibleDisplay ? (
            INACCESSIBLE_DISPLAY_LABEL
          ) : (
            item.stringifiedData
          )}
        </span>
      </>
    );
  },
);
