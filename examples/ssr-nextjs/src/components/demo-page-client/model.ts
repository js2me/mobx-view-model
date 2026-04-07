import { VM } from '@/shared/lib/vm';
import { action, makeObservable, observable } from 'mobx';

export type DemoPagePayload = {
  /** Shown above the article; defaults in the client wrapper. */
  pageTitle?: string;
  headline: string;
  serverRenderedAt: string;
  bumpable?: boolean;
};

/**
 * ViewModel with its own observable state: after hydration, the button
 * increments a counter to verify MobX + observer in the browser.
 */
export class DemoPageVM extends VM<DemoPagePayload> {
  title = `This value received from root store - "${this.rootStore.appInfo.appName}"`;

  clientInteractions = 0;

  bump(): void {
    this.clientInteractions += 1;
  }

  protected willMount(): void {
    makeObservable(this, {
      clientInteractions: observable,
      bump: action.bound,
    });
  }
}
