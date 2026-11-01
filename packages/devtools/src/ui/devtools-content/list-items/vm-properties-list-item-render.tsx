import { observer } from 'mobx-react-lite';
import type { CSSProperties } from 'react';
import type { VMPropertiesListItem } from '@/model/list-item/vm-properties-list-item';
import { ExpandButton } from '../expand-button';
import css from './property-list-item-render/styles.module.css';

export const VMPropertiesListItemRender = observer(
  ({ item }: { item: VMPropertiesListItem }) => (
    <div
      className={`${css.property} ${css.expandable}`}
      data-depth={item.depthLine}
      style={{ '--level': item.depth } as CSSProperties}
    >
      <button
        type="button"
        className={css.vmPropertiesToggle}
        aria-expanded={item.isExpanded}
        onClick={item.toggleExpand}
      >
        <ExpandButton
          expandable={item.isExpandable}
          expanded={item.isExpanded}
        />
        <span aria-hidden="true">⚙️</span>&nbsp;<i>vm properties</i>
      </button>
    </div>
  ),
);
