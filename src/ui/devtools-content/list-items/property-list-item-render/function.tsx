import { observer } from 'mobx-react-lite';
import { skipEvent } from 'yummies/html';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';

export const FunctionPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const argLabels = [...Array(item.data.length)].map(
      (_, i) => `arg${i + 1}`,
    );

    return (
      <>
        <span className={css.propertyName}>{item.property}</span>
        {item.isEditMode ? (
          <>
            {`(`}
            <input
              value={item.editContent}
              className={css.editContent}
              onChange={item.handleChangeEditContent}
              onClick={skipEvent as any}
              data-ignore-global-keys
            />
            {`)`}
          </>
        ) : (
          `(${argLabels.join(', ')})`
        )}
      </>
    );
  },
);
