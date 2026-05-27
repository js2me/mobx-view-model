import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import {
  DateInstanceCollapsedValue,
  shouldShowDateInstanceCollapsedValue,
} from './date-instance-collapsed-value';
import css from './styles.module.css';
import { INACCESSIBLE_DISPLAY_LABEL } from '@/model/utils/safe-access';

export const InstancePropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const valueLabel = item.isInaccessibleDisplay
      ? INACCESSIBLE_DISPLAY_LABEL
      : item.instanceClassName;

    const showDateCollapsedPreview = shouldShowDateInstanceCollapsedValue(
      item.data,
      item.isExpanded,
      item.isInaccessibleDisplay,
      item.instanceClassName,
    );

    return (
      <>
        {item.property === undefined ? null : (
          <>
            <span className={css.propertyName}>{item.property}</span>
            :&nbsp;
          </>
        )}
        {showDateCollapsedPreview ? (
          <DateInstanceCollapsedValue
            className={css.propertyValue}
            instanceClassName={item.instanceClassName}
            data={item.data}
          />
        ) : (
          <span className={css.propertyValue}>{valueLabel}</span>
        )}
        {item.isExpanded && !item.isInaccessibleDisplay && <>&nbsp;{`{`}</>}
      </>
    );
  },
);
