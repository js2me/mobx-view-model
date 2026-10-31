import { observer } from 'mobx-react-lite';
import { skipEvent } from 'yummies/html';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';

export const FunctionPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const argLabels = item.isInaccessible ? [] : [...Array(item.data.length)].map(
      (_, i) => `arg${i + 1}`,
    );

    return (
      <>
        <span className={css.propertyName}>{item.property}</span>
        {item.editor?.isEditMode ? (
          <>
            {`(`}
            <input
              value={item.editor.editContent}
              className={css.editContent}
              onChange={item.editor.handleChangeEditContent}
              onKeyDown={item.editor.handleEditKeyDown}
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
