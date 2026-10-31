import { action, makeObservable, observable } from 'mobx';

export type AppInfoSnapshot = {
  appName: string;
  environment: string;
};

export class AppInfoStore {
  appName: string;
  environment: string;

  constructor(initial?: Partial<AppInfoSnapshot>) {
    this.appName = initial?.appName ?? 'CSR React 19 App';
    this.environment =
      initial?.environment ??
      (process.env.NODE_ENV === 'production' ? 'production' : 'development');

    makeObservable(this, {
      appName: observable,
      environment: observable,
      patch: action,
    });
  }

  patch(next: Partial<AppInfoSnapshot>): void {
    if (next.appName !== undefined) this.appName = next.appName;
    if (next.environment !== undefined) this.environment = next.environment;
  }
}
