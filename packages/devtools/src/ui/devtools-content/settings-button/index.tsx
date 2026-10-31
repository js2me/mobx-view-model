import { Display, Gear, Moon, Sun } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import type { ViewModelDevtools } from '@/model';
import { IconToggleButton } from '../../shared/icon-toggle-button';
import css from './styles.module.css';

export const SettingsButton = observer(
  ({ devtools }: { devtools: ViewModelDevtools }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (!isOpen) return;

      const handlePointerDown = (event: MouseEvent) => {
        const wrap = wrapRef.current;
        if (!wrap || event.composedPath().includes(wrap)) return;
        setIsOpen(false);
      };

      document.addEventListener('mousedown', handlePointerDown, {
        capture: true,
      });

      return () => {
        document.removeEventListener('mousedown', handlePointerDown, {
          capture: true,
        });
      };
    }, [isOpen]);

    return (
      <span ref={wrapRef} className={css.settingsWrap} data-no-drag>
        <button
          type="button"
          className={css.settingsButton}
          aria-label="Settings"
          aria-expanded={isOpen}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setIsOpen((open) => !open);
          }}
        >
          <Gear />
        </button>
        {isOpen && (
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
            <label className={css.settingRow}>
              <span className={css.settingLabel}>Highlight updates</span>
              <input
                type="checkbox"
                className={css.settingCheckbox}
                checked={devtools.highlightUpdates}
                onChange={(event) => {
                  devtools.handleHighlightUpdatesChange(event.target.checked);
                }}
              />
            </label>
          </div>
        )}
      </span>
    );
  },
);
