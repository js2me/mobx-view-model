import { observer } from 'mobx-react-lite';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from 'yummies/css';
import type { PropertyListItem } from '@/model/list-item/property-list-item';
import { ListItemOperations } from '../../list-item-operations';
import { ArrayPropertyContent } from './array';
import { FunctionPropertyContent } from './function';
import { InstancePropertyContent } from './instance';
import { ObjectPropertyContent } from './object';
import { MapEntryPropertyContent } from './map-entry';
import { PrimitivePropertyContent } from './primitive';
import { SetEntryPropertyContent } from './set-entry';
import { usePropertyUpdateHighlight } from './use-property-update-highlight';
import css from './styles.module.css';

export interface PropertyListItemRenderProps {
  item: PropertyListItem;
}

export const PropertyListItemRender = observer(
  (props: PropertyListItemRenderProps) => {
    const { item } = props;
    const isUpdateHighlighted = usePropertyUpdateHighlight(item);

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
      case 'map-entry': {
        content = <MapEntryPropertyContent {...props} />;
        break;
      }
      case 'set-entry': {
        content = <SetEntryPropertyContent {...props} />;
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
          [css.inaccessible]: item.isInaccessibleDisplay,
          [css.null]: item.data === null,
          [css.expandable]: item.isExpandable,
          [css.expanded]: item.isExpanded,
          [css.isEditMode]: item.editor.isEditMode,
          [css.updateHighlighted]: isUpdateHighlighted,
        })}
        style={
          { '--level': item.depth, '--order': item.order } as CSSProperties
        }
        data-fitted={item.devtools.searchEngine.isItemFitted(item)}
        data-depth={item.depthLine}
      >
        <span
          className={css.propertyContent}
          onClick={(e) => item.devtools.handlePropertyClick(item, e)}
        >
          {content}
          {item.extraContent ? (
            <span className={css.propertySuffix}>{item.extraContent}</span>
          ) : null}
        </span>
        <ListItemOperations item={item} />
      </div>
    );
  },
);
