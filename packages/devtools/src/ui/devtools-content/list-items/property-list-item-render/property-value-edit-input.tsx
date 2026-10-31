import { observer } from 'mobx-react-lite';
import { skipEvent } from 'yummies/html';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';

export const PropertyValueEditInput = observer(
  ({ item }: PropertyListItemRenderProps) => {
    return (
      <input
        value={item.editor.editContent}
        className={css.editContent}
        onChange={item.editor.handleChangeEditContent}
        onKeyDown={item.editor.handleEditKeyDown}
        onClick={skipEvent as any}
        data-ignore-global-keys
      />
    );
  },
);
