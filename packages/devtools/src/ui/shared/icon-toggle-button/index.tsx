import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { cx } from 'yummies/css';
import css from './styles.module.css';

export const IconToggleButton = ({
  value,
  options,
  className,
  onUpdate,
}: {
  value: any;
  options: { value: any; icon: ComponentType }[];
  className?: string;
  onUpdate: (value: any) => void;
}) => {
  const optionNodes: ReactNode[] = [];
  let activeIndex: undefined | number;

  options.forEach((option, i) => {
    const { icon: Icon, value: optionValue } = option;

    const isActive = value === optionValue;

    if (isActive) {
      activeIndex = i;
    }

    optionNodes.push(
      <div
        className={cx(css.option, {
          [css.active]: isActive,
        })}
        key={i}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUpdate(options[i].value);
        }}
      >
        <Icon />
      </div>,
    );
  });

  return (
    <button className={cx(css.iconToggleButton, className)}>
      <div
        className={css.activePosition}
        style={{ '--index': activeIndex } as CSSProperties}
      />
      {optionNodes}
    </button>
  );
};
