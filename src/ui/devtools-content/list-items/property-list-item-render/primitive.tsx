import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';
import { INACCESSIBLE_DISPLAY_LABEL } from '@/model/utils/safe-access';

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
          {item.isInaccessibleDisplay
            ? INACCESSIBLE_DISPLAY_LABEL
            : item.stringifiedData}
        </span>
      </>
    );
  },
);
