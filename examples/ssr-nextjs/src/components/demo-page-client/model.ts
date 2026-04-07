import { action, makeObservable, observable } from 'mobx';
import { ViewModelBase, type ViewModelParams } from 'mobx-view-model';

export type DemoPagePayload = {
  headline: string;
  serverRenderedAt: string;
  bumpable?: boolean;
};

/**
 * ViewModel with its own observable state: after hydration, the button
 * increments a counter to verify MobX + observer in the browser.
 */
export class DemoPageVM extends ViewModelBase<DemoPagePayload> {
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
