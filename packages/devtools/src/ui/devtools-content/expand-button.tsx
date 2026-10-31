import { ChevronRight } from '@gravity-ui/icons';
import { cx } from 'yummies/css';
import css from './styles.module.css';

export const ExpandButton = ({
  expandable,
  expanded,
  onClick,
  disabled,
  showIconAnyway,
}: {
  expandable?: boolean;
  expanded?: boolean;
  onClick?: VoidFunction;
  disabled?: boolean;
  showIconAnyway?: boolean;
}) => {
  return (
    <span
      onClick={onClick}
      className={cx(css.expandButton, {
        [css.expandable]: expandable,
        [css.expanded]: expanded,
        [css.disabled]: disabled,
      })}
    >
      {(expandable || showIconAnyway) && <ChevronRight />}
    </span>
  );
};
