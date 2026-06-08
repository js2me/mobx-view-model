import { observer } from 'mobx-react-lite';
import type { CSSProperties } from 'react';
import { cx } from 'yummies/css';
import type { VMListItem } from '@/model/list-item/vm-list-item';
import css from '@/styles.module.css';
import { ExpandButton } from '@/ui/devtools-content/expand-button';
import { TreeItemNestingBadge } from '@/ui/devtools-content/tree-item-nesting-badge';
import { ListItemOperations } from '../../list-item-operations';

export const VmListItemRender = observer(
  ({ item, compact }: { item: VMListItem; compact?: boolean }) => {
    return (
      <div
        className={cx(css.treeItem, css.vmTreeItem)}
        data-fitted={item.devtools.searchEngine.isItemFitted(item)}
        data-depth={item.depthLine}
        data-compact={compact || undefined}
        style={{ '--level': item.depth } as CSSProperties}
      >
        <div
          className={css.treeItemHeader}
          onClick={() => item.devtools.handleVmItemHeaderClick(item)}
        >
          <ExpandButton
            showIconAnyway={item.devtools.presentationMode === 'tree'}
            expandable={item.devtools.isExpandable(item)}
            expanded={item.isExpanded}
          />
          <span className={css.treeItemLabel} title={item.displayName}>
            {item.displayName}
          </span>
          <span className={css.treeItemMetaText} title={item.data.id}>
            {item.data.id}
          </span>
          {compact && (
            <TreeItemNestingBadge
              depth={item.depth}
              parentLabel={item.parentLabel}
            />
          )}
        </div>
        <ListItemOperations item={item} />
      </div>
    );
  },
);
