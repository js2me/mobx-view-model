import { observer } from 'mobx-react-lite';
import type { CSSProperties } from 'react';
import { cx } from 'yummies/css';
import type { MetaListItem } from '@/model/list-item/meta-list-item';
import css from './property-list-item-render/styles.module.css';

export const MetaListItemRender = observer(
  ({ item }: { item: MetaListItem }) => {
    return (
      <div
        className={cx(css.property, css.primitive)}
        style={{ '--level': item.depth } as CSSProperties}
        data-fitted={item.devtools.searchEngine.isItemFitted(item)}
        title={item.stringifiedData}
        data-depth={item.depthLine}
      >
        {item.content}
      </div>
    );
  },
);
