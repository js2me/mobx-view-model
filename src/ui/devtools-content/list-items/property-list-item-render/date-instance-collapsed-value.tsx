import { observer } from 'mobx-react-lite';
import { cx } from 'yummies/css';
import { getDateToStringValue, isDateLike } from '@/model/utils/date-like';
import { CollectionMeta, CollectionTypedValue } from './collection-typed-value';
import css from './styles.module.css';

export const DateInstanceCollapsedValue = observer(
  ({
    className,
    instanceClassName,
    data,
  }: {
    className: string;
    instanceClassName: string;
    data: Date;
  }) => {
    const toStringValue = getDateToStringValue(data);

    return (
      <span className={className}>
        <span className={cx(css.typedValue, css.instance)}>
          {instanceClassName}
        </span>
        <CollectionMeta>{' ('}</CollectionMeta>
        <CollectionTypedValue value={toStringValue} displayType="string">
          {toStringValue}
        </CollectionTypedValue>
        <CollectionMeta>{')'}</CollectionMeta>
      </span>
    );
  },
);

export function shouldShowDateInstanceCollapsedValue(
  data: unknown,
  isExpanded: boolean,
  isInaccessibleDisplay: boolean,
  instanceClassName: string,
): data is Date {
  return (
    !isExpanded &&
    !isInaccessibleDisplay &&
    isDateLike(data) &&
    instanceClassName === 'Date'
  );
}
