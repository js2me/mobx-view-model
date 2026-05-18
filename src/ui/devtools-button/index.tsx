import { withViewModel } from 'mobx-view-model';
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
            [css.opened]: model.devtools.isPopupOpened,
            [css.isConnected]: model.devtools.isActive,
          },
          model.devtools.config.buttonClassName,
        )}
        ref={model.ref}
        data-position={model.devtools.position}
      >
        <img src={model.devtools.logoUrl} />
        <div />
        <span className={css.vmsCount}>{model.devtools.allVms.length}</span>
        <span className={css.keyboardHint}>{`Ctrl+F12`}</span>
      </button>
    );
  },
);
