import { Display, Gear, Moon, Sun } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { ViewModelDevtools } from '@/model';
import { IconToggleButton } from '../../shared/icon-toggle-button';
import css from './styles.module.css';

export const SettingsButton = observer(
  ({ devtools }: { devtools: ViewModelDevtools }) => {
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
            >
              <div className={css.settingRow}>
                <span className={css.settingLabel}>Theme</span>
                <IconToggleButton
                  value={devtools.theme}
                  onUpdate={devtools.handleThemeChange}
                  options={[
                    { value: 'light', icon: Sun },
                    { value: 'auto', icon: Display },
                    { value: 'dark', icon: Moon },
                  ]}
                />
              </div>
              <label className={css.settingRow}>
                <span className={css.settingLabel}>Show internals</span>
                <input
                  type="checkbox"
                  className={css.settingCheckbox}
                  checked={!devtools.hideViewModelBaseMembers}
                  onChange={(event) => {
                    devtools.handleHideViewModelBaseMembersChange(
                      !event.target.checked,
                    );
                  }}
                />
              </label>
            </div>
          </>
        )}
      </span>
    );
  },
);
