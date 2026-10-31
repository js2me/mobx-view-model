import { Magnifier, Xmark } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { cx } from 'yummies/css';
import type { InspectorSearch } from '@/model/search/search-model';
import css from './styles.module.css';

export const SearchField = observer(
  ({ search }: { search: InspectorSearch }) => (
    <div className={css.searchField}>
      <div className={cx(css.vmContentInput, search.isActive && css.filled)}>
        <Magnifier />
        {search.suggestionSuffix && (
          <div className={css.inputGhost} aria-hidden="true">
            <span className={css.inputGhostTyped}>{search.searchText}</span>
            <span className={css.inputGhostSuggestion}>
              {search.suggestionSuffix}
            </span>
          </div>
        )}
        <input
          ref={search.searchInputRef}
          autoFocus
          value={search.searchText}
          onChange={search.handleSearchInput}
          onKeyDown={search.handleKeyDown}
          onFocus={search.handleSearchInputFocus}
          onBlur={search.handleSearchInputBlur}
          placeholder={
            search.suggestionSuffix
              ? ''
              : 'search by property path or ViewModel name'
          }
          aria-label="Search ViewModels and properties"
          className={
            search.suggestionSuffix ? css.inputWithSuggestion : undefined
          }
        />
        {search.searchText && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={search.resetSearch}
          >
            <Xmark />
          </button>
        )}
      </div>
      {search.shouldShowSuggestions && (
        <div
          className={css.inputSuggestions}
          role="listbox"
          aria-label="Search suggestions"
        >
          <div className={css.inputSuggestionsList}>
            {search.suggestionItems.map((suggestion, index) => (
              <div
                key={`${suggestion.owner.key}/${suggestion.value}`}
                role="option"
                aria-selected={index === search.selectedSuggestionIndex}
                onMouseEnter={() => search.selectSuggestionAtIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  search.applySuggestionFromClick(suggestion, index);
                }}
                className={cx(
                  css.inputSuggestionItem,
                  index === search.selectedSuggestionIndex && css.selected,
                )}
              >
                {!search.isNestedSearch && (
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
            ))}
          </div>
        </div>
      )}
    </div>
  ),
);
