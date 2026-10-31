import { ArrowsRotateRight } from '@gravity-ui/icons';
import { computed, makeObservable, untracked } from 'mobx';
import { isViewModel } from 'mobx-view-model';
import type { DevtoolsInspector } from '../devtools-inspector';
import { forceUpdateViewModel } from '../editing/force-update-view-model';
import { getAllKeys } from '../inspection/get-all-keys';
import { getViewModelBaseKeys } from '../inspection/get-view-model-base-keys';
import { sortPropertyKeys } from '../inspection/sort-property-keys';
import type { AnyVM } from '../types';
import { ListItem, type ListItemOperation } from './list-item';
import { PropertyListItem } from './property-list-item';

export class VMListItem extends ListItem<AnyVM> {
  private get childVMListItems(): VMListItem[] {
    this.dataWatchAtom.reportObserved();

    return this.allVms
      .filter((maybeChildVm) => {
        return maybeChildVm.parentViewModel === this.data;
      })
      .map((it) => new VMListItem(this.inspector, it, this.allVms, this));
  }

  private get propertyListItems(): PropertyListItem[] {
    this.dataWatchAtom.reportObserved();

    let keys = getAllKeys(this.data);

    if (this.inspector.settings.hideViewModelBaseMembers) {
      const baseKeys = getViewModelBaseKeys();
      keys = keys.filter((key) => !baseKeys.has(key));
    }

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
    return [...this.propertyListItems, ...this.childVMListItems];
  }

  getSavedTempVarNotification(tempVarName: string) {
    return `VM instance ${this.displayName} (${this.data.id}) saved into ${tempVarName}`;
  }

  get operations(): ListItemOperation<any>[] {
    const operations: ListItemOperation<any>[] = [];

    if (this.canForceUpdateView) {
      operations.push({
        title: 'Force update bound view',
        icon: ArrowsRotateRight,
        action: () => {
          const result = forceUpdateViewModel(this.data);

          if (!result.ok) {
            this.inspector.notifications.push({ title: result.error });
            return;
          }

          this.reportDataChanged();
          this.inspector.notifications.push({
            title: `Bound view for ${this.displayName} (${this.data.id}) was force-updated`,
          });
        },
      });
    }

    return [...operations, ...super.operations];
  }

  private get canForceUpdateView() {
    return isViewModel(this.data);
  }

  get depth(): number {
    if (this.parent && this.inspector.settings.presentationMode === 'tree') {
      return this.parent.depth + 1;
    }

    return 0;
  }

  get parentLabel(): string | null {
    return this.parent?.displayName ?? null;
  }

  searchData;

  displayName;

  constructor(
    inspector: DevtoolsInspector,
    vm: AnyVM,
    private allVms: AnyVM[],
    private parent?: VMListItem,
  ) {
    const displayName = vm.constructor.name;
    const key = `${displayName}-${vm.id}`;

    super(inspector, key, vm);

    this.displayName = displayName;
    this.searchData = {
      name: displayName.toLowerCase().trim(),
      id: (vm.id || '').toLowerCase().trim(),
    };

    computed.struct(this, 'childVMListItems');
    computed.struct(this, 'propertyListItems');
    makeObservable(this);

    untracked(() => {
      if (!this.inspector.expansion.has(this.key)) {
        this.expand();
      }
    });
  }
}
