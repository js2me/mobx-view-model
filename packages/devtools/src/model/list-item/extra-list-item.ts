import { computed, makeObservable, untracked } from 'mobx';
import type { AnyObject } from 'yummies/types';
import type { DevtoolsInspector } from '../devtools-inspector';
import { sortPropertyKeys } from '../inspection/sort-property-keys';
import type { AnyVM } from '../types';
import { ListItem, type ListItemOperation } from './list-item';
import { PropertyListItem } from './property-list-item';

export class ExtraListItem extends ListItem<AnyVM> {
  private get propertyListItems(): PropertyListItem[] {
    this.dataWatchAtom.reportObserved();

    let keys = Object.keys(this.data || {});

    keys = sortPropertyKeys(keys, this.inspector.settings.sortPropertiesBy);

    return keys.map((property, order) => {
      return PropertyListItem.create(
        this.inspector,
        property,
        property,
        order,
        this,
      );
    });
  }

  get children(): ListItem<any>[] {
    return this.propertyListItems;
  }

  get operations(): ListItemOperation<any>[] {
    return super.operations;
  }

  get depth(): number {
    return 0;
  }

  searchData;

  displayName;

  constructor(inspector: DevtoolsInspector, extras: AnyObject) {
    const displayName = 'Extras';
    const key = `extra$$$-${displayName}-`;

    super(inspector, key, extras);

    this.displayName = displayName;
    this.searchData = {
      name: displayName.toLowerCase().trim(),
    };

    computed.struct(this, 'propertyListItems');
    makeObservable(this);

    untracked(() => {
      if (!this.inspector.expansion.has(this.key)) {
        this.expand();
      }
    });
  }
}
