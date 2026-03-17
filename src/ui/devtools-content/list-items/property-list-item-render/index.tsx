import { observer } from 'mobx-react-lite';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from 'yummies/css';
import type { PropertyListItem } from '@/model/list-item/property-list-item';
import { ListItemOperations } from '../../list-item-operations';
import { ArrayPropertyContent } from './array';
import { FunctionPropertyContent } from './function';
import { InstancePropertyContent } from './instance';
import { ObjectPropertyContent } from './object';
import { PrimitivePropertyContent } from './primitive';
import css from './styles.module.css';

export interface PropertyListItemRenderProps {
  item: PropertyListItem;
}

export const PropertyListItemRender = observer(
  (props: PropertyListItemRenderProps) => {
    const { item } = props;

    let content: ReactNode = null;

    switch (props.item.type) {
      case 'array': {
        content = <ArrayPropertyContent {...props} />;
        break;
      }
      case 'function': {
        content = <FunctionPropertyContent {...props} />;
        break;
      }
      case 'instance': {
        content = <InstancePropertyContent {...props} />;
        break;
      }
      case 'object': {
        content = <ObjectPropertyContent {...props} />;
        break;
      }
      case 'primitive': {
        content = <PrimitivePropertyContent {...props} />;
        break;
      }
    }

    return (
      <div
        className={cx(css.property, css[item.type], css[item.dataType], {
          [css.null]: item.data === null,
          [css.expandable]: item.isExpandable,
          [css.expanded]: item.isExpanded,
          [css.isEditMode]: item.isEditMode,
        })}
        style={
          { '--level': item.depth, '--order': item.order } as CSSProperties
        }
        data-fitted={item.devtools.searchEngine.isItemFitted(item)}
        title={item.stringifiedData}
        onClick={(e) => item.devtools.handlePropertyClick(item, e)}
        data-depth={item.depthLine}
      >
        <span>
          {content}
          {item.extraContent}
        </span>
        <ListItemOperations item={item} />
      </div>
    );
  },
);
