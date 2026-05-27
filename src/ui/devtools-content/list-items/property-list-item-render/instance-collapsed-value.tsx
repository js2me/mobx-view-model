import { observer } from 'mobx-react-lite';
import { cx } from 'yummies/css';
import { getInspectorValueType } from '@/model/utils/get-inspector-value-type';
import { getInstanceToStringValue } from '@/model/utils/instance-to-string';
import { CollectionMeta, CollectionTypedValue } from './collection-typed-value';
import css from './styles.module.css';

export const InstanceCollapsedValue = observer(
  ({
    className,
    instanceClassName,
    data,
  }: {
    className: string;
    instanceClassName: string;
    data: object;
  }) => {
    const toStringValue = getInstanceToStringValue(data);

    return (
      <span className={className}>
        <span className={cx(css.typedValue, css.instance)}>
          {instanceClassName}
        </span>
        <CollectionMeta>{' ('}</CollectionMeta>
        <CollectionTypedValue
          value={toStringValue}
          displayType={getInspectorValueType(toStringValue)}
        >
          {toStringValue}
        </CollectionTypedValue>
        <CollectionMeta>{')'}</CollectionMeta>
      </span>
    );
  },
);

export { shouldShowInstanceCollapsedValue } from '@/model/utils/instance-to-string';
