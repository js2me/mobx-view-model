import { action, makeObservable, observable } from 'mobx';

export interface NotificationData {
  title: string;
  id: string;
}
export interface NotificationSink {
  push(data: { title: string; id?: string }): void;
}

export class DevtoolsNotifications implements NotificationSink {
  readonly items = observable.map<string, NotificationData>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    makeObservable(this, { push: action.bound });
  }
  push(data: { title: string; id?: string }) {
    const id = data.id ?? crypto.randomUUID();
    this.items.set(id, { ...data, id });
    const timer = setTimeout(
      action(() => {
        this.items.delete(id);
        this.timers.delete(timer);
      }),
      5000,
    );
    this.timers.add(timer);
  }
  destroy() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.items.clear();
  }
}
