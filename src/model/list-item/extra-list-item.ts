import { computed, makeObservable, untracked } from 'mobx';
import type { AnyObject } from 'yummies/types';
import type { AnyVM } from '../types';
import type { ViewModelDevtools } from '../view-model-devtools';
import { ListItem, type ListItemOperation } from './list-item';
import { PropertyListItem } from './property-list-item';

export class ExtraListItem extends ListItem<AnyVM> {
  get isFitted() {
    const { searchEngine } = this.devtools;

    if (!searchEngine.isActive) {
      return true;
    }

    const searchSegments = searchEngine.segments;

    if (searchSegments.length === 0) {
      return true;
    }

    const firstSegment = searchSegments[0];

    // Проверяем, содержит ли имя первый сегмент поиска
    const isFittedByName = this.searchData.name.includes(firstSegment);

    // Если только один сегмент - проверяем имя
    if (searchSegments.length === 1) {
      return isFittedByName;
    }

    // Если несколько сегментов - ExtraListItem подходит если имя содержит первый сегмент
    // Детальная фильтрация будет на уровне дочерних PropertyListItem
    return isFittedByName;
  }

  private get propertyListItems(): PropertyListItem[] {
    this.dataWatchAtom.reportObserved();

    let keys = Object.keys(this.data || {});

    if (this.devtools.sortPropertiesBy !== 'none') {
      keys = keys.sort((a, b) => {
        if (this.devtools.sortPropertiesBy === 'asc') {
          return a.localeCompare(b);
        }
        return b.localeCompare(a);
      });
    }

    return keys.map((property, order) => {
      return PropertyListItem.create(
        this.devtools,
        property,
        property,
        order,
        this,
      );
    });
  }

  get children(): ListItem<any>[] {
    return [...this.propertyListItems];
  }

  get operations(): ListItemOperation<any>[] {
    return super.operations;
  }

  get depth(): number {
    return 0;
  }

  searchData;

  displayName;

  constructor(devtools: ViewModelDevtools, extras: AnyObject) {
    const displayName = 'Extras';
    const key = `extra$$$-${displayName}-`;

    super(devtools, key, extras, undefined, new Map());

    this.displayName = displayName;
    this.searchData = {
      name: displayName.toLowerCase().trim(),
    };

    computed.struct(this, 'propertyListItems');
    makeObservable(this);

    untracked(() => {
      this.expand();
    });
  }
}
