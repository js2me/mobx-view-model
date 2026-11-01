import { Display, Gear, Moon, Sun } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { IconToggleButton } from '../../shared/icon-toggle-button';
import { SettingsButtonVM } from './model';
import css from './styles.module.css';

export const SettingsButton = withViewModel(SettingsButtonVM, ({ model }) => (
  <span ref={model.ref} className={css.settingsWrap} data-no-drag>
    <button
      type="button"
      className={css.settingsButton}
      aria-label="Settings"
      aria-expanded={model.isOpened}
      onMouseDown={model.stopPropagation}
      onClick={model.toggle}
    >
      <Gear />
    </button>
    {model.isOpened && (
      <div
        className={css.settingsPopup}
        role="dialog"
        aria-label="Settings"
        onClick={model.stopPropagation}
      >
        <div className={css.settingRow}>
          <span className={css.settingLabel}>Appearance</span>
          <IconToggleButton
            value={model.settings.theme}
            onUpdate={model.settings.setTheme}
            options={[
              { value: 'light', label: 'Light theme', icon: Sun },
              { value: 'auto', label: 'System theme', icon: Display },
              { value: 'dark', label: 'Dark theme', icon: Moon },
            ]}
          />
        </div>
        <label className={css.settingRow}>
          <span className={css.settingLabel}>Show internals</span>
          <input
            type="checkbox"
            className={css.settingCheckbox}
            checked={!model.settings.hideViewModelBaseMembers}
            onChange={model.handleShowInternals}
          />
        </label>
        <label className={css.settingRow}>
          <span className={css.settingLabel}>Group VM properties</span>
          <input
            type="checkbox"
            className={css.settingCheckbox}
            checked={model.settings.groupViewModelBaseMembers}
            onChange={model.handleGroupViewModelBaseMembers}
          />
        </label>
        <label className={css.settingRow}>
          <span className={css.settingLabel}>Highlight updates</span>
          <input
            type="checkbox"
            className={css.settingCheckbox}
            checked={model.settings.highlightUpdates}
            onChange={model.handleHighlightUpdates}
          />
        </label>
      </div>
    )}
  </span>
));
