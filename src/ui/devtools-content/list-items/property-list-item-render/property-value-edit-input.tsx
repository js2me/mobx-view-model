import { observer } from 'mobx-react-lite';
import { skipEvent } from 'yummies/html';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';

export const PropertyValueEditInput = observer(
  ({ item }: PropertyListItemRenderProps) => {
    return (
      <input
        value={item.editContent}
        className={css.editContent}
        onChange={item.handleChangeEditContent}
        onKeyDown={item.handleEditKeyDown}
        onClick={skipEvent as any}
        data-ignore-global-keys
      />
    );
  },
);
