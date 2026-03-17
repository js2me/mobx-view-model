import { observer } from 'mobx-react-lite';
import type { CSSProperties } from 'react';
import { cx } from 'yummies/css';
import type { VMListItem } from '@/model/list-item/vm-list-item';
import css from '@/styles.module.css';
import { ExpandButton } from '@/ui/devtools-content/expand-button';
import { ListItemOperations } from '../../list-item-operations';

export const VmListItemRender = observer(({ item }: { item: VMListItem }) => {
  return (
    <div
      className={cx(css.treeItem, css.vmTreeItem)}
      data-fitted={item.devtools.searchEngine.isItemFitted(item)}
      data-depth={item.depthLine}
      style={{ '--level': item.depth } as CSSProperties}
    >
      <header
        className={css.treeItemHeader}
        onClick={() => item.devtools.handleVmItemHeaderClick(item)}
      >
        <ExpandButton
          showIconAnyway={item.devtools.presentationMode === 'tree'}
          expandable={item.devtools.isExpandable(item)}
          expanded={item.isExpanded}
        />
        <label className={css.treeItemLabel} title={item.displayName}>
          {item.displayName}
        </label>
        <span className={css.treeItemMetaText} title={item.data.id}>
          {item.data.id}
        </span>
      </header>
      <ListItemOperations item={item} />
    </div>
  );
});
