import { ArrowsRotateRight } from '@gravity-ui/icons';
import { computed, makeObservable } from 'mobx';
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
  get isExpanded() {
    return (
      this.inspector.expansion.get(this.key) ??
      this.inspector.autoExpandViewModels
    );
  }
  get isExpandable() {
    return (
      this.propertyKeys.length > 0 ||
      (this.inspector.tree.children.get(this.data)?.length ?? 0) > 0
    );
  }
  get childVMListItems(): VMListItem[] {
    return (this.inspector.tree.children.get(this.data) ?? []).map((vm) =>
      this.inspector.getVmItem(vm),
    );
  }
  get propertyKeys() {
    let keys = getAllKeys(this.data);
    if (this.inspector.settings.hideViewModelBaseMembers) {
      const baseKeys = getViewModelBaseKeys();
      keys = keys.filter((key) => !baseKeys.has(key));
    }
    return sortPropertyKeys(keys, this.inspector.settings.sortPropertiesBy);
  }

  private get propertyListItems(): PropertyListItem[] {
    this.dataWatchAtom.reportObserved();

    return this.propertyKeys.map((property, order) => {
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
    if (this.inspector.settings.presentationMode !== 'tree') return 0;
    let depth = 0;
    let vm = this.inspector.tree.parents.get(this.data);
    while (vm) {
      depth++;
      vm = this.inspector.tree.parents.get(vm);
    }
    return depth;
  }

  get parent(): VMListItem | undefined {
    const vm = this.inspector.tree.parents.get(this.data);
    return vm ? this.inspector.getVmItem(vm) : undefined;
  }

  get parentLabel(): string | null {
    return this.parent?.displayName ?? null;
  }

  searchData;

  displayName;

  constructor(inspector: DevtoolsInspector, vm: AnyVM) {
    const displayName = vm.constructor.name;
    const key = getViewModelItemKey(vm);

    super(inspector, key, vm);

    this.displayName = displayName;
    this.searchData = {
      name: displayName.toLowerCase().trim(),
      id: (vm.id || '').toLowerCase().trim(),
    };

    computed(this, 'propertyKeys');
    computed.struct(this, 'childVMListItems');
    computed.struct(this, 'propertyListItems');
    makeObservable(this);
  }
}

export const getViewModelItemKey = (vm: AnyVM) =>
  `${vm.constructor.name}-${vm.id}`;
