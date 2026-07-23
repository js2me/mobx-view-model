import { Xmark } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { VmDevtoolsContent } from '../devtools-content';
import { VmDevtoolsPopupVM } from './model';
import css from './styles.module.css';

export const VmDevtoolsPopup = withViewModel(VmDevtoolsPopupVM, ({ model }) => {
  return (
    <div
      ref={model.contentRef}
      className={css.vmPopup}
      data-position={model.devtools.position}
    >
      <div className={css.resizeHandleCornerTopLeft} data-resize-handle="top-left" />
      <div className={css.resizeHandleTop} data-resize-handle="top" />
      <div className={css.resizeHandleCornerTopRight} data-resize-handle="top-right" />
      <div className={css.resizeHandleLeft} data-resize-handle="left" />
      <VmDevtoolsContent
        className={css.vmPopupContent}
        payload={{
          devtools: model.devtools,
        }}
        headerContent={
          <button
            className={css.closePopupButton}
            onClick={model.devtools.hidePopup}
          >
            <Xmark />
          </button>
        }
      />
      <div className={css.resizeHandleRight} data-resize-handle="right" />
      <div className={css.resizeHandleCornerBottomLeft} data-resize-handle="bottom-left" />
      <div className={css.resizeHandleBottom} data-resize-handle="bottom" />
      <div className={css.resizeHandleCornerBottomRight} data-resize-handle="bottom-right" />
    </div>
  );
});
