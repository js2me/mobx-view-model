import { action, makeObservable, observable } from 'mobx';
import { Storage } from 'mobx-swiss-knife';
import type { ViewModelDevtoolsConfig } from './devtools-config';
import { PopupLayout } from './window/popup-layout';

export class DevtoolsWindow {
  private readonly lifetime = new AbortController();
  private readonly storage = new Storage({
    namespace: 'mobx-view-model-devtools',
    type: 'local',
    abortSignal: this.lifetime.signal,
  });
  private readonly openListeners = new Set<() => void>();
  private readonly closeListeners = new Set<() => void>();
  readonly layout = new PopupLayout();
  isOpened: boolean;

  constructor(config: ViewModelDevtoolsConfig) {
    this.isOpened =
      this.storage.get({ key: 'isPopupOpened' }) ??
      config.defaultIsOpened ??
      false;
    makeObservable(this, {
      isOpened: observable.ref,
      show: action.bound,
      hide: action.bound,
      toggle: action.bound,
    });
    this.storage.syncProperty(this, 'isOpened', { key: 'isPopupOpened' });
  }

  show() {
    if (this.isOpened) return;
    this.isOpened = true;
    for (const listener of this.openListeners) listener();
  }
  hide() {
    if (!this.isOpened) return;
    this.isOpened = false;
    for (const listener of this.closeListeners) listener();
  }
  toggle() {
    this.isOpened ? this.hide() : this.show();
  }
  onOpen(listener: () => void) {
    this.openListeners.add(listener);
    return () => this.openListeners.delete(listener);
  }
  onClose(listener: () => void) {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }
  destroy() {
    this.hide();
    this.lifetime.abort();
    this.openListeners.clear();
    this.closeListeners.clear();
  }
}
