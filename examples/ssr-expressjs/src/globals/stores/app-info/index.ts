import { action, computed, makeObservable, observable } from 'mobx';
import { Router } from '../../router';

export type AppInfoSnapshot = {
  appName: string;
};

export class AppInfoStore {
  appName: string;
  title: string;

  constructor(private router: Router) {
    this.appName = 'GOZ0N';
    this.title = '';

    makeObservable(this, {
      appName: observable,
      patch: action,
      title: observable
    });
  }

  setTitle(title: string  ) {
    if (typeof window === 'undefined') {
      this.title = title;
    } else {
      globalThis.document.title = title;
    }
  }

  patch(next: Partial<AppInfoSnapshot>): void {
    if (next.appName !== undefined) {
      this.appName = next.appName;
    }
  }
}
