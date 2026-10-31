import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import type { VMListItem } from './list-item/vm-list-item';

export type AnyVM = AnyViewModelSimple | AnyViewModel;

export type VmTreeItem = {
  listItem: VMListItem;
  vm: AnyVM;
  displayName: string;
  children: VmTreeItem[];
  depth: number;
  key: string;
  properties: string[];
  searchData: {
    name: string;
    id: string;
  };
};
