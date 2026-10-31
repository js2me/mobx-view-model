import type { ComponentType } from 'react';
import { cx } from 'yummies/css';
import css from './styles.module.css';

export interface ToggleOption<T extends string> {
  value: T;
  label?: string;
  icon: ComponentType;
}
export function IconToggleButton<T extends string>({
  value,
  options,
  className,
  onUpdate,
}: {
  value: T;
  options: ToggleOption<T>[];
  className?: string;
  onUpdate: (value: T) => void;
}) {
  return (
    <div className={cx(css.iconToggleButton, className)} role="group">
      {options.map(({ value: optionValue, icon: Icon, label }) => (
        <button
          key={optionValue}
          type="button"
          className={cx(css.option, { [css.active]: value === optionValue })}
          aria-label={label ?? optionValue}
          title={label ?? optionValue}
          aria-pressed={value === optionValue}
          onClick={() => onUpdate(optionValue)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
