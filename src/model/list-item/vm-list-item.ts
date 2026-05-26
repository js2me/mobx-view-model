import { ArrowsRotateRight } from '@gravity-ui/icons';
import { computed, makeObservable, untracked } from 'mobx';
import { isViewModel, type ViewModelParams } from 'mobx-view-model';
import type { AnyVM } from '../types';
import { forceUpdateViewModel } from '../utils/force-update-view-model';
import { getAllKeys } from '../utils/get-all-keys';
import { getViewModelBaseKeys } from '../utils/get-view-model-base-keys';
import type { ViewModelDevtools } from '../view-model-devtools';
import { ListItem, type ListItemOperation } from './list-item';
import { PropertyListItem } from './property-list-item';

export class VMListItem extends ListItem<AnyVM> {
  private get childVMListItems(): VMListItem[] {
    this.dataWatchAtom.reportObserved();

    return this.allVms
      .filter((maybeChildVm) => {
        const params = this.getVmParams(maybeChildVm);
        return params?.parentViewModel && params.parentViewModel === this.data;
      })
      .map((it) => new VMListItem(this.devtools, it, this.allVms, this));
  }

  private get propertyListItems(): PropertyListItem[] {
    this.dataWatchAtom.reportObserved();

    let keys = getAllKeys(this.data);

    if (this.devtools.hideViewModelBaseMembers) {
      const baseKeys = getViewModelBaseKeys();
      keys = keys.filter((key) => !baseKeys.has(key));
    }

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
    return [...this.propertyListItems, ...this.childVMListItems];
  }

  private getVmParams(vm: AnyVM): null | ViewModelParams {
    if ('vmParams' in vm) {
      return vm.vmParams as ViewModelParams;
    }

    return null;
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
            this.devtools.notifications.push({ title: result.error });
            return;
          }

          this.reportDataChanged();
          this.devtools.notifications.push({
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
    if (this.parent && this.devtools.presentationMode === 'tree') {
      return this.parent.depth + 1;
    }

    return 0;
  }

  searchData;

  displayName;

  constructor(
    devtools: ViewModelDevtools,
    vm: AnyVM,
    private allVms: AnyVM[],
    private parent?: VMListItem,
  ) {
    const displayName = vm.constructor.name;
    const key = `${displayName}-${vm.id}`;

    super(devtools, key, vm);

    this.displayName = displayName;
    this.searchData = {
      name: displayName.toLowerCase().trim(),
      id: (vm.id || '').toLowerCase().trim(),
    };

    computed.struct(this, 'childVMListItems');
    computed.struct(this, 'propertyListItems');
    makeObservable(this);

    untracked(() => {
      if (!this.cache.has(this.expandKey)) {
        this.expand();
      }
    });
  }
}
