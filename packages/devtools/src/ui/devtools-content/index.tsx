import 'simplebar/dist/simplebar.css';
import { type ViewModelProps, withViewModel } from 'mobx-view-model-react';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from 'yummies/css';
import { LIST_ITEM_HEIGHT } from '@/model/inspector-scroll';
import { ExtraListItem } from '@/model/list-item/extra-list-item';
import { VMListItem } from '@/model/list-item/vm-list-item';
import { InspectorToolbar } from './inspector-toolbar';
import { ExtraListItemRender } from './list-items/extra-list-item-render';
import { ListItemRender } from './list-items/list-item-render';
import { VmListItemRender } from './list-items/vm-list-item-render';
import { DevtoolsContentVM } from './model';
import { Notifications } from './notifications';
import { SearchField } from './search-field';
import { SettingsButton } from './settings-button';
import css from './styles.module.css';

interface ContentProps extends ViewModelProps<DevtoolsContentVM> {
  className?: string;
  headerContent?: ReactNode;
  style?: CSSProperties;
}

export const VmDevtoolsContent = withViewModel(
  DevtoolsContentVM,
  ({ model, className, headerContent, ...props }: ContentProps) => {
    const { devtools } = model;
    const { inspector, settings } = devtools;
    return (
      <div
        {...props}
        ref={model.contentRef}
        className={cx(css.vmContent, className)}
        data-sticky-vm-active={model.stickyVmItem ? '' : undefined}
      >
        <div className={css.vmContentHeader}>
          <Notifications model={devtools.notifications} />
          <div className={css.vmContentHeaderTitle} data-content-header>
            <img
              className={css.vmContentHeaderLogo}
              src={devtools.logoUrl}
              alt=""
            />
            <span className={css.vmContentHeaderTitleText}>
              ViewModels{' '}
              <span className={css.connectionBadge}>
                {inspector.allVms.length} live
              </span>
            </span>
            <SettingsButton payload={{ settings }} />
            {headerContent}
          </div>
          <div
            className={cx(
              css.vmContentControlPanel,
              inspector.search.isActive && css.searchIsActive,
            )}
          >
            <InspectorToolbar settings={settings} />
            <SearchField search={inspector.search} />
          </div>
        </div>
        <div
          className={css.stickyVmHeader}
          style={{ display: model.stickyVmItem ? undefined : 'none' }}
        >
          {model.stickyVmItem instanceof VMListItem ? (
            <VmListItemRender item={model.stickyVmItem} compact />
          ) : model.stickyVmItem instanceof ExtraListItem ? (
            <ExtraListItemRender item={model.stickyVmItem} />
          ) : null}
        </div>
        {model.listItems.length === 0 && (
          <div className={css.emptyState}>
            {inspector.search.isActive
              ? 'No matching ViewModels or properties'
              : 'Connect a ViewModel store to start inspecting.'}
          </div>
        )}
        <div
          className={css.vmContentVirtualScroll}
          style={{ height: model.virtualHeight }}
        >
          <div className={css.vmContentVirtualizedContent}>
            {model.topOffset > 0 && <div style={{ height: model.topOffset }} />}
            {model.visibleItems.map((item, index) => {
              const isStickySource =
                index + model.startIndex === model.stickyVmItemIndex;
              return (
                <div
                  key={item.key}
                  className={
                    isStickySource ? css.listItemStickySource : undefined
                  }
                  style={
                    isStickySource
                      ? { height: LIST_ITEM_HEIGHT }
                      : { display: 'contents' }
                  }
                >
                  <ListItemRender item={item} />
                </div>
              );
            })}
            {model.bottomOffset > 0 && (
              <div style={{ height: model.bottomOffset }} />
            )}
          </div>
        </div>
      </div>
    );
  },
);
