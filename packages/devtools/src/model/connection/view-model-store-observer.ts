import type { DevtoolsInspector } from '../devtools-inspector';
import type { AnyVM } from '../types';

interface StoreObserverHost {
  readonly isPopupOpened: boolean;
  readonly inspector: Pick<DevtoolsInspector, 'readViewModels'>;
  notifyVmChange(): void;
  onPopupOpen(listener: () => void): () => void;
  onPopupClose(listener: () => void): () => void;
}

/** Also observes explicitly connected legacy stores with an isolated MobX runtime. */
export class ViewModelStoreObserver {
  private previousVms?: AnyVM[];
  private previousParents: unknown[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private readonly disposers;

  constructor(private readonly host: StoreObserverHost) {
    this.disposers = [
      host.onPopupOpen(this.start),
      host.onPopupClose(this.stop),
    ];
    if (host.isPopupOpened) this.start();
  }
  private check = () => {
    const vms = this.host.inspector.readViewModels();
    const previous = this.previousVms;
    if (
      previous &&
      vms.length === previous.length &&
      vms.every(
        (vm, index) =>
          vm === previous[index] &&
          vm.parentViewModel === this.previousParents[index],
      )
    )
      return;
    this.previousVms = vms;
    this.previousParents = vms.map((vm) => vm.parentViewModel);
    this.host.notifyVmChange();
  };
  private start = () => {
    if (this.timer !== undefined) return;
    this.check();
    this.timer = setInterval(this.check, 500);
  };
  private stop = () => {
    clearInterval(this.timer);
    this.timer = undefined;
    this.previousVms = undefined;
    this.previousParents = [];
  };
  destroy() {
    this.stop();
    for (const dispose of this.disposers) dispose();
  }
}
