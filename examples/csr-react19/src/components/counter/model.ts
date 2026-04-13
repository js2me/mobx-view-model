import { VM } from '../../shared/lib/vm.js';
import { action, makeObservable, observable } from 'mobx';

type CounterPayload = {
  headline: string;
};

export class CounterVM extends VM<CounterPayload> {
  clicks = 0;

  bump() {
    this.clicks += 1;
  }

  protected willMount(): void {
    makeObservable(this, {
      clicks: observable,
      bump: action.bound,
    });
  }
}
