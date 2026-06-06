import { computed, makeObservable, untracked } from 'mobx';
import type { AnyObject } from 'yummies/types';
import type { AnyVM } from '../types';
import type { ViewModelDevtools } from '../view-model-devtools';
import { sortPropertyKeys } from '../utils/sort-property-keys';
import { ListItem, type ListItemOperation } from './list-item';
import { PropertyListItem } from './property-list-item';

export class ExtraListItem extends ListItem<AnyVM> {
  private get propertyListItems(): PropertyListItem[] {
    this.dataWatchAtom.reportObserved();

    let keys = Object.keys(this.data || {});

    keys = sortPropertyKeys(keys, this.devtools.sortPropertiesBy);

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

    super(devtools, key, extras);

    this.displayName = displayName;
    this.searchData = {
      name: displayName.toLowerCase().trim(),
    };

    computed.struct(this, 'propertyListItems');
    makeObservable(this);

    untracked(() => {
      if (!this.cache.has(this.expandKey)) {
        this.expand();
      }
    });
  }
}
