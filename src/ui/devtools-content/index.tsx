import {
  BarsAscendingAlignLeftArrowDown,
  BarsDescendingAlignCenter,
  BarsDescendingAlignLeftArrowUp,
  FolderTree,
  ListUl,
  Magnifier,
  Xmark,
} from '@gravity-ui/icons';
import { type ViewModelProps, withViewModel } from 'mobx-view-model';
import type { ReactNode } from 'react';
import { cx } from 'yummies/css';
import { IconToggleButton } from '../shared/icon-toggle-button';
import { DevtoolsContentVM } from './model';
import { Notifications } from './notifications';
import css from './styles.module.css';

export const VmDevtoolsContent = withViewModel(
  DevtoolsContentVM,
  ({
    model,
    className,
    headerContent,
    ...props
  }: {
    className?: string;
    headerContent?: ReactNode;
  } & ViewModelProps<DevtoolsContentVM>) => {
    const { devtools } = model.payload;

    return (
      <div
        {...props}
        className={cx(css.vmContent, className)}
        ref={model.contentRef}
      >
        <header className={css.vmContentHeader}>
          <Notifications />
          <div className={css.gradientBlur} />
          <div className={css.vmContentHeaderTitle} data-content-header>
            <img className={css.vmContentHeaderLogo} src={devtools.logoUrl} />
            <span className={css.vmContentHeaderTitleText}>
              mobx-view-model devtools
            </span>
            {headerContent}
          </div>
          <div className={css.vmContentControlPanel}>
            <div className={css.vmContentControlPanelActions}>
              <IconToggleButton
                onUpdate={devtools.handleChangePresentationMode}
                options={[
                  {
                    value: 'tree',
                    icon: FolderTree,
                  },
                  {
                    value: 'list',
                    icon: ListUl,
                  },
                ]}
                value={devtools.presentationMode}
              />
              <IconToggleButton
                onUpdate={devtools.handleSortPropertiesChange}
                options={[
                  {
                    value: 'none',
                    icon: BarsDescendingAlignCenter,
                  },
                  {
                    value: 'asc',
                    icon: BarsAscendingAlignLeftArrowDown,
                  },
                  {
                    value: 'desc',
                    icon: BarsDescendingAlignLeftArrowUp,
                  },
                ]}
                value={devtools.sortPropertiesBy}
              />
            </div>
            <div
              className={`${css.vmContentInput} ${devtools.searchEngine.isActive && css.filled}`}
            >
              <Magnifier />
              <input
                ref={devtools.searchEngine.searchInputRef}
                autoFocus
                placeholder="search by property path or ViewModel name"
              />
              <button onClick={devtools.searchEngine.resetSearch}>
                <Xmark />
              </button>
            </div>
          </div>
        </header>
        <div
          className={css.vmContentVirtualScroll}
          style={{ height: model.virtualHeight }} // 10_0000
        >
          <div
            className={css.vmContentVirtualizedContent}
          >
            {model.itemNodes}
          </div>
        </div>
      </div>
    );
  },
);
