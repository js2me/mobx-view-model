import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
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
          {item.isInaccessibleDisplay
            ? item.inaccessibleDisplayLabel
            : item.stringifiedData}
        </span>
      </>
    );
  },
);
