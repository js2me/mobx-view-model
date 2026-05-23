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
import { SettingsButton } from './settings-button';
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
              <SettingsButton />
            </span>
            {headerContent}
          </div>
          <div
            className={cx(css.vmContentControlPanel, {
              [css.searchIsActive]: devtools.searchEngine.isActive,
            })}
          >
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
              className={cx(
                css.vmContentInput,
                devtools.searchEngine.isActive && css.filled,
              )}
            >
              <Magnifier />
              {devtools.searchEngine.suggestionSuffix && (
                <div className={css.inputGhost} aria-hidden="true">
                  <span className={css.inputGhostTyped}>
                    {devtools.searchEngine.searchText}
                  </span>
                  <span className={css.inputGhostSuggestion}>
                    {devtools.searchEngine.suggestionSuffix}
                  </span>
                </div>
              )}
              <input
                ref={devtools.searchEngine.searchInputRef}
                autoFocus
                value={devtools.searchEngine.searchText}
                onChange={devtools.searchEngine.handleSearchInput}
                onKeyDown={devtools.searchEngine.handleKeyDown}
                onFocus={devtools.searchEngine.handleSearchInputFocus}
                onBlur={devtools.searchEngine.handleSearchInputBlur}
                placeholder={
                  devtools.searchEngine.suggestionSuffix
                    ? ''
                    : 'search by property path or ViewModel name'
                }
                className={
                  devtools.searchEngine.suggestionSuffix
                    ? css.inputWithSuggestion
                    : undefined
                }
              />
              <button onClick={devtools.searchEngine.resetSearch}>
                <Xmark />
              </button>
            </div>
            {devtools.searchEngine.shouldShowSuggestions && (
              <div className={css.inputSuggestions} aria-hidden="true">
                <span className={css.inputGhostTyped}>
                  {devtools.searchEngine.searchText}
                </span>
                <div className={css.inputSuggestionsList}>
                  {devtools.searchEngine.suggestionItems.map(
                    (suggestion, index) => (
                      <div
                        key={`${suggestion.owner.key}/${suggestion.value}`}
                        onMouseEnter={() => {
                          devtools.searchEngine.selectSuggestionAtIndex(index);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          devtools.searchEngine.applySuggestionFromClick(
                            suggestion,
                            index,
                          );
                        }}
                        className={cx(
                          css.inputSuggestionItem,
                          index ===
                            devtools.searchEngine.selectedSuggestionIndex &&
                            css.selected,
                        )}
                      >
                        {!devtools.searchEngine.isNestedSearch && (
                          <span
                            className={`${css.inputSuggestionOwner} ${css[suggestion.owner.type]}`}
                          >
                            {suggestion.owner.name}
                          </span>
                        )}
                        <span className={css.inputSuggestionValue}>
                          {suggestion.value}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <div
          className={css.vmContentVirtualScroll}
          style={{ height: model.virtualHeight }} // 10_0000
        >
          <div className={css.vmContentVirtualizedContent}>
            {model.itemNodes}
          </div>
        </div>
      </div>
    );
  },
);
