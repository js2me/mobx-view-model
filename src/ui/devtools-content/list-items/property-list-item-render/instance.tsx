import { observer } from 'mobx-react-lite';
import type { PropertyListItemRenderProps } from '.';
import css from './styles.module.css';

export const InstancePropertyContent = observer(
  ({ item }: PropertyListItemRenderProps) => {
    const valueLabel = item.isInaccessibleDisplay
      ? item.inaccessibleDisplayLabel
      : item.instanceClassName;

    return (
      <>
        {item.property === undefined ? null : (
          <>
            <span className={css.propertyName}>{item.property}</span>
            :&nbsp;
          </>
        )}
        <span className={css.propertyValue}>{valueLabel}</span>
        {item.isExpanded && !item.isInaccessibleDisplay && <>&nbsp;{`{`}</>}
      </>
    );
  },
);
