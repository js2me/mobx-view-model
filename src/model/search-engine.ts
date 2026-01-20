import { action, computed, makeObservable, observable } from 'mobx';
import type { AnyObject } from 'yummies/types';
import type { VMListItem } from './list-item/vm-list-item';
import {
  createFocusableRef,
  type FocusableRef,
} from './utils/create-focusable-ref';

export type SearchInput =
  | { type: 'vm'; item: VMListItem }
  | { type: 'extras'; item: AnyObject };

export class SearchEngine {
  searchInputRef: FocusableRef<HTMLInputElement>;

  public fittedVmIds = new Set<string>();

  private rawSearchText!: string;
  public formattedSearchText!: string;

  private searchTextUpdateTimeout: number | undefined;

  segments: string[] = [];

  get isActive() {
    return !!this.formattedSearchText;
  }

  private setSearchText(searchText: string) {
    this.rawSearchText = searchText;
    this.formattedSearchText = searchText.toLowerCase().trim();

    this.segments.length = 0;

    if (!this.formattedSearchText) {
      return;
    }

    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    let strictSearchByProperties = false;

    let startWithNextSegment = true;

    for (let i = 0; i < searchText.length; ) {
      const char = searchText[i];

      if (i === 0 && char === '.') {
        strictSearchByProperties = true;
        i++;
        continue;
      }

      if (char === ' ') {
        i++;
        continue;
      }

      if (char === '.') {
        startWithNextSegment = true;
        i++;
        continue;
      }

      // scenarios
      // foo.bar[0]
      // foo.bar[1000]
      // foo.bar['baz']
      // foo.bar["baz"]
      // if (char === '[') {
      //   let bunch = '';
      //   let charsToCheck = 1;
      //   while (searchText[i + charsToCheck] !== undefined) {
      //     const nextChar = searchText[i + charsToCheck];
      //     bunch += nextChar;
      //     charsToCheck++;
      //   }
      //   segments.push(searchText[i + 1]);
      //   startWithNextSegment = true;
      //   i += 2;
      //   continue;
      // }

      if (startWithNextSegment) {
        this.segments.push('');
        startWithNextSegment = false;
      }

      const lastIndex = this.segments.length - 1;
      this.segments[lastIndex] += char.toLowerCase();

      i++;
    }
  }

  resetSearch = () => {
    clearTimeout(this.searchTextUpdateTimeout!);
    this.setSearchText('');
    if (this.searchInputRef.current) {
      this.searchInputRef.current.value = '';
    }
  };

  constructor() {
    this.setSearchText('');

    this.searchInputRef = createFocusableRef<HTMLInputElement>({
      onSet: (input) => {
        if (this.rawSearchText && input.value !== this.rawSearchText) {
          input.value = this.rawSearchText;
        }

        input.addEventListener('input', () => {
          clearTimeout(this.searchTextUpdateTimeout!);
          // Увеличиваем debounce для больших иерархий
          this.searchTextUpdateTimeout = setTimeout(() => {
            this.setSearchText(input.value);
          }, 300);
        });
      },
    });

    makeObservable<
      typeof this,
      'rawSearchText' | 'formattedSearchText' | 'setSearchText'
    >(this, {
      rawSearchText: observable.ref,
      formattedSearchText: observable.ref,
      isActive: computed,
      segments: observable,
      setSearchText: action.bound,
    });
  }
}
