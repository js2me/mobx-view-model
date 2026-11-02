import { PropertyListItem } from '../list-item/property-list-item';
import { notifyMapEntryOwner, notifyPropertyOwner } from './mobx-edit-adapter';
import type { PropertyEditorHost } from './property-editor';

export class PropertyEditPropagation {
  constructor(private readonly host: PropertyEditorHost) {}
  notify() {
    let current = this.host;
    while (current instanceof PropertyListItem) {
      if (
        current.collectionEntryKind === 'map' &&
        notifyMapEntryOwner(current.parentListItem.data, current.mapEntryKey)
      )
        return;
      if (
        notifyPropertyOwner(
          current.parentListItem.data,
          current.property ?? undefined,
        )
      )
        return;
      const parent = current.parentListItem;
      if (!(parent instanceof PropertyListItem)) return;
      current = parent;
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
