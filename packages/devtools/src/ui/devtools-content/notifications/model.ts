import { action, makeObservable, observable } from 'mobx';
import { ViewModelBase } from 'mobx-view-model';
import type { PartialKeys } from 'yummies/types';

export interface NotificationData {
  title: string;
  id: string;
}

export class NotificationsVM extends ViewModelBase {
  items = observable.map<string, NotificationData>();

  push(data: PartialKeys<NotificationData, 'id'>) {
    const id = data.id ?? crypto.randomUUID();
    this.items.set(id, {
      ...data,
      id,
    });
    setTimeout(
      action(() => this.items.delete(id)),
      5000,
    );
  }
  

  willMount(): void {
    makeObservable(this, {
      push: action.bound,
    });
  }
}
