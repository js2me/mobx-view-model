import { observer } from 'mobx-react-lite';
import { INACCESSIBLE_DISPLAY_LABEL } from '@/model/inspection/safe-access';
import type { PropertyListItemRenderProps } from '.';
import {
  InstanceCollapsedValue,
  shouldShowInstanceCollapsedValue,
} from './instance-collapsed-value';
import css from './styles.module.css';

export const InstancePropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const valueLabel = item.isInaccessibleDisplay
      ? INACCESSIBLE_DISPLAY_LABEL
      : item.instanceClassName;

    const showCollapsedPreview = shouldShowInstanceCollapsedValue(
      item.data,
      item.isExpanded,
      item.isInaccessibleDisplay,
      item.type,
    );

    return (
      <>
        {item.property === undefined ? null : (
          <>
            <span className={css.propertyName}>{item.property}</span>
            :&nbsp;
          </>
        )}
        {showCollapsedPreview ? (
          <InstanceCollapsedValue
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
