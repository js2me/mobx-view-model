import { runInAction } from 'mobx';
import { getMobxPropertyKeys, notifyPropertyOwner } from './mobx-edit-adapter';

/** Explicit refresh button; ordinary property edits never scan the VM. */
export function notifyMobxObjectChange(object: object, key?: string) {
  runInAction(() => {
    if (key != null) notifyPropertyOwner(object, key);
    else
      for (const propertyKey of getMobxPropertyKeys(object))
        notifyPropertyOwner(object, propertyKey);
  });
}
