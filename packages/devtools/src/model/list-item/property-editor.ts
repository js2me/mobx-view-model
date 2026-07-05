import {
  action,
  computed,
  makeObservable,
  observable,
} from 'mobx';
import type { ChangeEventHandler, KeyboardEventHandler } from 'react';
import type { Maybe } from 'yummies/types';
import type { CollectionKind } from '../utils/collection-like';
import type { ViewModelDevtools } from '../view-model-devtools';
import { formatSearchSegmentKey } from '../utils/format-search-key';
import { isInaccessible } from '../utils/safe-access';
import {
  invalidateMobxObject,
  invalidateMobxProperty,
  invalidateViewModelsAfterEdit,
} from '../utils/invalidate-view-models-after-edit';
import { notifyMobxEditPropagation } from '../utils/notify-mobx-change';
import {
  ensureMobxPropertyAtomLoaded,
  findMobxAdministration,
} from '../utils/mobx-administration';
import { resolveComputedProducerForEdit } from '../utils/resolve-computed-producer';
import { setMapEntryValue, setSetEntryValue } from '../utils/set-collection-entry-value';
import { setPropertyValue } from '../utils/set-property-value';
import type { AnyVM } from '../types';
import { PropertyListItem } from './property-list-item';
import { VMListItem } from './vm-list-item';

export interface PropertyEditorHost {
  readonly property: Maybe<string>;
  readonly type: string;
  readonly dataType: string;
  readonly data: any;
  readonly isInaccessible: boolean;
  readonly nestedValueType: string;
  readonly collectionEntryKind?: CollectionKind;
  readonly collectionEntryIndex?: number;
  readonly getPreview?: () => unknown;
  readonly mapEntryKey: unknown;
  readonly stringifiedData: string;
  readonly parentListItem: any;
  readonly devtools: ViewModelDevtools;
  reportDataChanged(): void;
}

function registerEditedHost(hosts: object[], host: object) {
  if (!hosts.includes(host)) {
    hosts.push(host);
  }
}

function formatEditError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class PropertyEditor {
  editContent = '';
  isEditMode = false;

  constructor(private readonly host: PropertyEditorHost) {
    makeObservable(this, {
      editContent: observable.ref,
      isEditMode: observable,
      isEditable: computed,
      editableContent: computed,
      handleChangeEditContent: action,
      handleEditKeyDown: action,
      startEdit: action,
      cancelEdit: action,
      applyEdit: action,
      toggleBoolean: action,
      confirmEdit: action,
      callFunction: action,
    });
  }

  get isEditable() {
    const h = this.host;
    if (h.isInaccessible || isInaccessible(h.parentListItem.data)) {
      return false;
    }

    if (h.getPreview) {
      return false;
    }

    if (h.collectionEntryKind === 'map' || h.collectionEntryKind === 'set') {
      return (
        h.property !== undefined &&
        h.nestedValueType !== 'instance' &&
        h.nestedValueType !== 'function'
      );
    }

    return (
      h.property !== undefined &&
      h.collectionEntryKind == null &&
      h.type !== 'instance' &&
      !h.isInaccessible &&
      !isInaccessible(h.parentListItem.data)
    );
  }

  get editableContent() {
    const h = this.host;
    if (h.isInaccessible) {
      return '';
    }

    if (h.collectionEntryKind != null) {
      return this.formatEditableNestedValue();
    }

    switch (h.type) {
      case 'object':
      case 'array': {
        try {
          return JSON.stringify(h.data, null, 2);
        } catch {
          return h.stringifiedData;
        }
      }
      default: {
        switch (h.dataType) {
          case 'bigint':
            return `${String(h.data)}n`;
          case 'symbol':
            return `Symbol(${Symbol.keyFor(h.data as symbol) || ''})`;
          case 'string':
            return `"${String(h.data)}"`;
        }

        return String(h.data);
      }
    }
  }

  handleChangeEditContent: ChangeEventHandler<HTMLInputElement> = (e) => {
    this.editContent = e.target.value;
  };

  handleEditKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.confirmEdit();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.cancelEdit();
    }
  };

  confirmEdit() {
    if (this.host.dataType === 'function') {
      this.callFunction();
      return;
    }

    this.applyEdit();
  }

  callFunction() {
    // biome-ignore lint/security/noGlobalEval: no way...
    const args = eval(`[${this.editContent.trim()}]`);
    this.host.data.apply(this.host.parentListItem.data, args);
    this.cancelEdit();
  }

  startEdit() {
    this.editContent = this.editableContent;
    this.isEditMode = true;
  }

  cancelEdit() {
    this.editContent = '';
    this.isEditMode = false;
  }

  applyEdit() {
    if (!this.isEditable || this.host.property === undefined) {
      return;
    }

    let parsed: unknown;

    try {
      parsed = this.parseEditContent();
    } catch (error) {
      this.host.devtools.notifications.push({
        title: `Failed to parse value for "${this.getEditTargetLabel()}": ${formatEditError(error)}`,
      });
      return;
    }

    if (!this.commitParsedEdit(parsed)) {
      return;
    }

    this.cancelEdit();
  }

  toggleBoolean() {
    if (
      !this.isEditable ||
      this.host.dataType !== 'boolean' ||
      this.host.property === undefined
    ) {
      return;
    }

    const nextValue = !this.host.data;
    this.commitParsedEdit(nextValue);
  }

  private commitParsedEdit(parsed: unknown): boolean {
    const result = this.applyParsedEdit(parsed);

    if (!result.ok) {
      this.host.devtools.notifications.push({
        title: `Failed to update "${this.getEditTargetLabel()}": ${result.error}`,
      });
      return false;
    }

    this.notifyHostAppAfterEdit(result.producerTarget);
    this.reportDataChangedUpwards();
    return true;
  }

  private getEditTargetLabel() {
    const h = this.host;
    if (h.collectionEntryKind === 'map' && h.mapEntryKey != null) {
      return formatSearchSegmentKey(h.mapEntryKey);
    }

    return String(h.property);
  }

  private applyParsedEdit(parsed: unknown): {
    ok: boolean;
    error?: string;
    producerTarget?: { host: object; key: string };
  } {
    const h = this.host;

    if (h.collectionEntryKind === 'map') {
      const key = h.mapEntryKey;

      if (key === undefined) {
        return { ok: false, error: 'Map key is missing' };
      }

      return setMapEntryValue(h.parentListItem.data, key, parsed);
    }

    if (h.collectionEntryKind === 'set') {
      return setSetEntryValue(h.parentListItem.data, h.data, parsed);
    }

    const producerTarget = resolveComputedProducerForEdit(
      h as PropertyListItem,
      parsed,
    );

    if (producerTarget) {
      const result = setPropertyValue(
        producerTarget.host,
        producerTarget.key,
        producerTarget.value,
      );

      return result.ok
        ? { ok: true, producerTarget }
        : { ok: false, error: result.error };
    }

    if (h.property == null) {
      return { ok: false, error: 'Property key is missing' };
    }

    const result = setPropertyValue(h.parentListItem.data, h.property, parsed);

    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  private parseEditContent(): unknown {
    const content = this.editContent.trim();

    // biome-ignore lint/security/noGlobalEval: devtools edit field, same as function call args
    return eval(`(${content})`);
  }

  private formatEditableNestedValue() {
    const h = this.host;
    switch (h.nestedValueType) {
      case 'object':
      case 'array': {
        try {
          return JSON.stringify(h.data, null, 2);
        } catch {
          return h.stringifiedData;
        }
      }
      default: {
        switch (h.dataType) {
          case 'bigint':
            return `${String(h.data)}n`;
          case 'symbol':
            return `Symbol(${Symbol.keyFor(h.data as symbol) || ''})`;
          case 'string':
            return `"${String(h.data)}"`;
        }

        return String(h.data);
      }
    }
  }

  private notifyHostAppAfterEdit(producerTarget?: {
    host: object;
    key: string;
  }) {
    const h = this.host;
    if (h.property === undefined) {
      return;
    }

    const editedHosts: object[] = [];
    const pathFromVm = this.buildMobxPathFromVm(producerTarget);

    if (h.collectionEntryKind != null) {
      registerEditedHost(editedHosts, h.parentListItem.data);
      invalidateMobxObject(h.parentListItem.data);
    } else if (producerTarget) {
      registerEditedHost(editedHosts, producerTarget.host);
      invalidateMobxProperty(producerTarget.host, producerTarget.key);

      const nestedInfo = (producerTarget.host as { info?: object }).info;

      if (nestedInfo && typeof nestedInfo === 'object') {
        registerEditedHost(editedHosts, nestedInfo);
        invalidateMobxProperty(nestedInfo, producerTarget.key);
      }
    } else if (h.property != null) {
      registerEditedHost(editedHosts, h.parentListItem.data);
      invalidateMobxProperty(h.parentListItem.data, h.property);
    }

    let ancestor: any = h.parentListItem;

    while (ancestor instanceof PropertyListItem) {
      if (ancestor.property != null) {
        invalidateMobxProperty(
          ancestor.parentListItem.data,
          ancestor.property,
        );
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
      (h.property != null ? h.parentListItem.data : undefined);

    let relatedVms: object[] = [];

    if (editedHost && typeof editedHost === 'object') {
      relatedVms = invalidateViewModelsAfterEdit({
        editedHost,
        editedPropertyKey: producerTarget?.key,
        pathFromAncestorVm: pathFromVm,
        viewModels: h.devtools.allVms,
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

  private buildMobxPathFromVm(producerTarget?: { key: string }) {
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

    if (producerTarget) {
      return segments.slice(0, -1);
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
    for (const vm of this.host.devtools.allVms) {
      ensureMobxPropertyAtomLoaded(vm, '_payload');
      ensureMobxPropertyAtomLoaded(vm, 'payload');
      findMobxAdministration(vm);
    }
  }

  private reportDataChangedUpwards() {
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
