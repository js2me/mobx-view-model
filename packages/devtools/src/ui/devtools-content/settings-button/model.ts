import { action, makeObservable, observable } from 'mobx';
import { createRef } from 'yummies/mobx';
import type { DevtoolsSettings } from '@/model/devtools-settings';
import { ViewModelImpl } from '@/model/lib/view-model.impl';

export class SettingsButtonVM extends ViewModelImpl<{
  settings: DevtoolsSettings;
}> {
  readonly settings = this.payload.settings;
  isOpened = false;
  readonly ref = createRef<HTMLSpanElement>();

  willMount() {
    makeObservable(this, {
      isOpened: observable.ref,
      toggle: action.bound,
      close: action.bound,
    });
    document.addEventListener(
      'mousedown',
      (event) => {
        if (
          this.isOpened &&
          this.ref.current &&
          !event.composedPath().includes(this.ref.current)
        )
          this.close();
      },
      { capture: true, signal: this.unmountSignal },
    );
  }
  close() {
    this.isOpened = false;
  }
  toggle(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.isOpened = !this.isOpened;
  }
  stopPropagation = (event: React.MouseEvent) => event.stopPropagation();
  handleShowInternals = (event: React.ChangeEvent<HTMLInputElement>) =>
    this.settings.setShowInternals(event.target.checked);
  handleGroupViewModelBaseMembers = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => this.settings.setGroupViewModelBaseMembers(event.target.checked);
  handleHighlightUpdates = (event: React.ChangeEvent<HTMLInputElement>) =>
    this.settings.setHighlightUpdates(event.target.checked);
}
