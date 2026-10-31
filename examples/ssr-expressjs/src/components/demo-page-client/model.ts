import { action, makeObservable, observable } from 'mobx';
import { VM } from '../../shared/lib/vm.js';

export type DemoPagePayload = {
  pageTitle?: string;
  headline: string;
  serverRenderedAt: string;
  bumpable?: boolean;
};

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
