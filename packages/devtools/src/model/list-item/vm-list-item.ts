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
import { VMPropertiesListItem } from './vm-properties-list-item';

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
    if (
      this.inspector.settings.shouldHideBaseProperties(
        this.inspector.search.isActive,
      )
    ) {
      const baseKeys = getViewModelBaseKeys();
      keys = keys.filter((key) => !baseKeys.has(key));
    }
    return sortPropertyKeys(keys, this.inspector.settings.sortPropertiesBy);
  }

  get groupsBaseProperties() {
    return (
      this.inspector.settings.groupViewModelBaseMembers &&
      !this.inspector.search.isActive
    );
  }

  get basePropertyKeys() {
    const baseKeys = getViewModelBaseKeys();
    return this.propertyKeys.filter((key) => baseKeys.has(key));
  }

  get vmPropertiesItem() {
    return VMPropertiesListItem.create(this);
  }

  private get propertyListItems(): ListItem<any>[] {
    this.dataWatchAtom.reportObserved();

    const keys = this.groupsBaseProperties
      ? this.propertyKeys.filter((key) => !getViewModelBaseKeys().has(key))
      : this.propertyKeys;
    const items: ListItem<any>[] = keys.map((property, order) => {
      return PropertyListItem.create(
        this.inspector,
        property,
        property,
        order,
        this,
      );
    });
    if (this.groupsBaseProperties && this.basePropertyKeys.length)
      items.push(this.vmPropertiesItem);
    return items;
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
