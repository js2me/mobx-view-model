import { Gear } from '@gravity-ui/icons';
import { useState } from 'react';
import css from './styles.module.css';

export const SettingsButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className={css.settingsWrap}>
      <button
        type="button"
        className={css.settingsButton}
        aria-label="Settings"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setIsOpen((open) => !open);
        }}
      >
        <Gear />
      </button>
      {isOpen && (
        <>
          <div
            className={css.settingsBackdrop}
            onClick={() => setIsOpen(false)}
          />
          <div
            className={css.settingsPopup}
            role="dialog"
            aria-label="Settings"
            onClick={(event) => event.stopPropagation()}
          />
        </>
      )}
    </span>
  );
};
