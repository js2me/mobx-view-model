import { observer } from 'mobx-react-lite';
import type { CSSProperties } from 'react';
import { cx } from 'yummies/css';
import type { PropertyWatchHistoryHeaderListItem } from '@/model/list-item/property-watch-history-header-item';
import css from '../property-list-item-render/styles.module.css';

export const PropertyWatchHistoryHeaderRender = observer(
  ({ item }: { item: PropertyWatchHistoryHeaderListItem }) => {
    const { parent } = item;

    return (
      <div
        className={cx(css.property, css.primitive, css.watchHistoryHeaderRow)}
        style={{ '--level': item.depth } as CSSProperties}
        data-fitted={item.devtools.searchEngine.isItemFitted(item)}
        data-depth={item.depthLine}
      >
        <span className={css.watchHistoryHeader}>{item.label}</span>
        <button
          type="button"
          className={css.watchHistoryClearButton}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            parent.clearWatchHistory();
          }}
        >
          clear
        </button>
      </div>
    );
  },
);
