import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';
import {
  getNestedValueExpandedOpen,
  getNestedValuePreview,
} from './format-collection-inspector-value';

export const SetEntryPropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const valuePart = item.isExpanded
      ? (getNestedValueExpandedOpen(item) ?? item.stringifiedData)
      : getNestedValuePreview(item);

    return (
      <>
        <span className={css.propertyName}>{item.property}</span>
        :&nbsp;
        <span className={css.propertyValue}>
          {'{ '}
          {valuePart}
          {!item.isExpanded && ' }'}
        </span>
      </>
    );
  },
);
