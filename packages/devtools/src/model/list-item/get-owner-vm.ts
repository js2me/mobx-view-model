import type { AnyVM } from '../types';
import type { ListItem } from './list-item';
import { VMListItem } from './vm-list-item';

/** Includes snapshot children and watch headers as well as live properties. */
export function getOwnerVm(item: ListItem<any>): AnyVM | undefined {
  let current: ListItem<any> | undefined = item;
  while (current) {
    if (current instanceof VMListItem) return current.data;
    current =
      Reflect.get(current, 'parentListItem') ?? Reflect.get(current, 'parent');
  }
  return undefined;
}
