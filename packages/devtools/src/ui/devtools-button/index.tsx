import { withViewModel } from 'mobx-view-model-react';
import { cx } from 'yummies/css';
import { VmDevtoolsButtonVM } from './model';
import css from './styles.module.css';

export const VmDevtoolsButton = withViewModel(
  VmDevtoolsButtonVM,
  ({ model }) => {
    return (
      <button
        className={cx(
          css.vmButton,
          {
            [css.opened]: model.devtools.window.isOpened,
            [css.dragging]: model.gesture?.isActive,
            [css.isConnected]: model.devtools.isActive,
          },
          model.devtools.config.buttonClassName,
        )}
        ref={model.ref}
        type="button"
        aria-label="Toggle ViewModel Devtools"
        aria-expanded={model.devtools.window.isOpened}
        onMouseDown={model.handleMouseDown}
        onClick={model.handleClick}
        data-position={model.devtools.position}
      >
        <img src={model.devtools.logoUrl} />
        <span className={css.buttonText}>
          <span className={css.buttonLabel}>ViewModels</span>
          <span className={css.keyboardHint}>Ctrl + F12</span>
        </span>
        <span className={css.vmsCount}>{model.devtools.allVms.length}</span>
      </button>
    );
  },
);
