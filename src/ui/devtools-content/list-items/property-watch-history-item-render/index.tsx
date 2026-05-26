import { observer } from 'mobx-react-lite';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from 'yummies/css';
import type { PropertyListItem } from '@/model/list-item/property-list-item';
import type { PropertyWatchHistoryListItem } from '@/model/list-item/property-watch-history-item';
import { ListItemOperations } from '../../list-item-operations';
import { ArrayPropertyContent } from '../property-list-item-render/array';
import { FunctionPropertyContent } from '../property-list-item-render/function';
import { InstancePropertyContent } from '../property-list-item-render/instance';
import { ObjectPropertyContent } from '../property-list-item-render/object';
import { PrimitivePropertyContent } from '../property-list-item-render/primitive';
import css from '../property-list-item-render/styles.module.css';

export const PropertyWatchHistoryItemRender = observer(
  ({ item }: { item: PropertyWatchHistoryListItem }) => {
    const contentItem = item as unknown as PropertyListItem;

    let content: ReactNode = null;

    switch (item.type) {
      case 'array': {
        content = <ArrayPropertyContent item={contentItem} />;
        break;
      }
      case 'function': {
        content = <FunctionPropertyContent item={contentItem} />;
        break;
      }
      case 'instance': {
        content = <InstancePropertyContent item={contentItem} />;
        break;
      }
      case 'object': {
        content = <ObjectPropertyContent item={contentItem} />;
        break;
      }
      case 'primitive': {
        content = <PrimitivePropertyContent item={contentItem} />;
        break;
      }
    }

    return (
      <div
        className={cx(
          css.property,
          css[item.type],
          css[item.dataType],
          css.watchHistoryEntry,
          {
            [css.inaccessible]: item.isInaccessibleDisplay,
            [css.null]: item.data === null,
            [css.expandable]: item.isExpandable,
            [css.expanded]: item.isExpanded,
          },
        )}
        style={
          { '--level': item.depth, '--order': item.order } as CSSProperties
        }
        data-fitted={item.devtools.searchEngine.isItemFitted(item)}
        data-depth={item.depthLine}
      >
        <span
          onClick={(e) => {
            if (
              (e.target as HTMLElement).closest(
                '[data-list-item-operations-wrapper]',
              )
            ) {
              return;
            }

            item.toggleExpand();
          }}
        >
          <span className={css.watchHistoryMeta}>
            <span className={css.watchHistoryIndex}>#{item.order + 1}</span>
            <span className={css.watchHistoryTime}>{item.formattedTime}</span>
          </span>
          {content}
        </span>
        <ListItemOperations item={item} />
      </div>
    );
  },
);
