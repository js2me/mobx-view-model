import { PropertyListItem } from '../list-item/property-list-item';
import { VMListItem } from '../list-item/vm-list-item';
import type { AnyVM } from '../types';
import {
  invalidateMobxObject,
  invalidateMobxProperty,
  invalidateViewModelsAfterEdit,
} from './invalidate-view-models-after-edit';
import {
  ensureMobxPropertyAtomLoaded,
  findMobxAdministration,
} from './mobx-administration';
import { notifyMobxEditPropagation } from './notify-mobx-change';
import type { PropertyEditorHost } from './property-editor';

function registerEditedHost(hosts: object[], host: object) {
  if (!hosts.includes(host)) hosts.push(host);
}

export class PropertyEditPropagation {
  constructor(private readonly host: PropertyEditorHost) {}
  notify(producerTarget?: { host: object; key: string }) {
    const host = this.host;
    if (host.property === undefined) {
      return;
    }

    const editedHosts: object[] = [];
    const pathFromVm = this.buildMobxPathFromVm();

    if (host.collectionEntryKind != null) {
      registerEditedHost(editedHosts, host.parentListItem.data);
      invalidateMobxObject(host.parentListItem.data);
    } else if (producerTarget) {
      registerEditedHost(editedHosts, producerTarget.host);
      invalidateMobxProperty(producerTarget.host, producerTarget.key);

      const nestedInfo = (producerTarget.host as { info?: object }).info;

      if (nestedInfo && typeof nestedInfo === 'object') {
        registerEditedHost(editedHosts, nestedInfo);
        invalidateMobxProperty(nestedInfo, producerTarget.key);
      }
    } else if (host.property != null) {
      registerEditedHost(editedHosts, host.parentListItem.data);
      invalidateMobxProperty(host.parentListItem.data, host.property);
    }

    let ancestor: any = host.parentListItem;

    while (ancestor instanceof PropertyListItem) {
      if (ancestor.property != null) {
        invalidateMobxProperty(ancestor.parentListItem.data, ancestor.property);
      }

      if (
        ancestor.parentListItem.data &&
        typeof ancestor.parentListItem.data === 'object'
      ) {
        registerEditedHost(editedHosts, ancestor.parentListItem.data);
      }

      ancestor = ancestor.parentListItem;
    }

    if (ancestor instanceof VMListItem) {
      registerEditedHost(editedHosts, ancestor.data);
      invalidateMobxObject(ancestor.data);

      try {
        this.refreshViewModelPayload(ancestor.data);
      } catch {
        // App ViewModel may use a separate mobx-view-model bundle.
      }
    }

    this.bootstrapViewModelAdministrations();

    const editedHost =
      producerTarget?.host ??
      (host.property != null ? host.parentListItem.data : undefined);

    let relatedVms: object[] = [];

    if (editedHost && typeof editedHost === 'object') {
      relatedVms = invalidateViewModelsAfterEdit({
        editedHost,
        editedPropertyKey: producerTarget?.key,
        pathFromAncestorVm: pathFromVm,
        viewModels: host.inspector.allVms,
      });
    }

    notifyMobxEditPropagation({
      editedHosts,
      relatedViewModels: relatedVms,
    });

    for (const vm of relatedVms) {
      try {
        this.refreshViewModelPayload(vm);
      } catch {
        // App ViewModel may use a separate mobx-view-model bundle.
      }
    }
  }

  private buildMobxPathFromVm() {
    const segments: string[] = [];
    let current: any = this.host;

    while (current instanceof PropertyListItem) {
      if (current.property != null) {
        segments.unshift(current.property);
      }

      current = current.parentListItem;
    }

    if (segments.length === 0) {
      return segments;
    }

    return segments.slice(0, -1);
  }

  private refreshViewModelPayload(vm: AnyVM) {
    if (!('setPayload' in vm) || typeof vm.setPayload !== 'function') {
      return;
    }

    if (!('payload' in vm)) {
      return;
    }

    const payload = (vm as { payload: unknown }).payload;

    if (payload === null || typeof payload !== 'object') {
      return;
    }

    vm.setPayload(Array.isArray(payload) ? [...payload] : { ...payload });
  }

  private bootstrapViewModelAdministrations() {
    for (const vm of this.host.inspector.allVms) {
      ensureMobxPropertyAtomLoaded(vm, '_payload');
      ensureMobxPropertyAtomLoaded(vm, 'payload');
      findMobxAdministration(vm);
    }
  }

  reportDataChanged() {
    let current: any = this.host;

    while (current) {
      current.reportDataChanged();
      current =
        current instanceof PropertyListItem
          ? current.parentListItem
          : undefined;
    }
  }
}
