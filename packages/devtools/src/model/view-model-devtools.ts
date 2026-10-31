import type { ViewModelStoreBase } from 'mobx-view-model';
import type { AnyObject } from 'yummies/types';
import { DevtoolsRenderer } from '../ui/devtools-renderer';
import { devtoolsLogo } from '../ui/logo';
import type { ViewModelDevtoolsConfig } from './devtools-config';
import { DevtoolsInspector } from './devtools-inspector';
import { DevtoolsSettings } from './devtools-settings';
import { DevtoolsWindow } from './devtools-window';
import { KeyboardHandler } from './keyboard-handler';
import { ViewModelStoreImpl } from './lib/view-model-store.impl';
import { DevtoolsNotifications } from './notifications';

export type * from './devtools-config';
export type {
  DevtoolsTheme,
  ResolvedDevtoolsTheme,
} from './devtools-settings-storage';

export class ViewModelDevtools {
  private readonly lifetime = new AbortController();
  readonly abortSignal = this.lifetime.signal;
  private static instance: ViewModelDevtools | null = null;
  readonly settings: DevtoolsSettings;
  readonly inspector: DevtoolsInspector;
  readonly window: DevtoolsWindow;
  readonly notifications = new DevtoolsNotifications();
  readonly vmStore = new ViewModelStoreImpl();
  readonly keyboardHandler: KeyboardHandler;
  private readonly renderer: DevtoolsRenderer;
  readonly logoUrl = devtoolsLogo;

  private constructor(readonly config: ViewModelDevtoolsConfig) {
    this.settings = new DevtoolsSettings(config);
    this.window = new DevtoolsWindow(config);
    this.inspector = new DevtoolsInspector(this.settings, this.notifications);
    this.inspector.setStore(config.viewModels);
    this.inspector.setExtras(config.extras);
    this.keyboardHandler = new KeyboardHandler(this);
    this.renderer = new DevtoolsRenderer(this);
    this.render();
  }

  // Public integration API used by the standalone script and Vite plugin.
  get isPopupOpened() {
    return this.window.isOpened;
  }
  get projectVmStore() {
    return this.inspector.store;
  }
  get allVms() {
    return this.inspector.allVms;
  }
  get isActive() {
    return this.inspector.isActive;
  }
  get listItems() {
    return this.inspector.listItems;
  }
  get searchEngine() {
    return this.inspector.search;
  }
  get theme() {
    return this.settings.theme;
  }
  get resolvedTheme() {
    return this.settings.resolvedTheme;
  }
  get position() {
    return this.settings.position;
  }
  set position(position: typeof this.settings.position) {
    this.settings.setPosition(position);
  }
  setStore = (store: ViewModelStoreBase | undefined) =>
    this.inspector.setStore(store);
  setExtras = (extras: AnyObject | null | undefined) =>
    this.inspector.setExtras(extras);
  notifyVmChange = () => this.inspector.notifyVmChange();
  showPopup = () => this.window.show();
  hidePopup = () => this.window.hide();
  onPopupOpen = (listener: () => void) => this.window.onOpen(listener);
  onPopupClose = (listener: () => void) => this.window.onClose(listener);
  render() {
    this.renderer.render();
  }
  destroy() {
    this.lifetime.abort();
    this.window.destroy();
    this.renderer.destroy();
    this.keyboardHandler.destroy();
    this.inspector.destroy();
    this.settings.destroy();
    this.notifications.destroy();
    this.vmStore.clean();
    if (ViewModelDevtools.instance === this) ViewModelDevtools.instance = null;
  }

  static define(config?: ViewModelDevtoolsConfig) {
    if (!ViewModelDevtools.instance)
      ViewModelDevtools.instance = new ViewModelDevtools(config ?? {});
    return ViewModelDevtools.instance;
  }
  static connect(
    viewModels: ViewModelDevtoolsConfig['viewModels'],
    extras?: AnyObject,
  ) {
    const devtools = ViewModelDevtools.define();
    devtools.setStore(viewModels);
    devtools.setExtras(extras);
    return devtools;
  }
  static connectViewModels(viewModels: ViewModelDevtoolsConfig['viewModels']) {
    const devtools = ViewModelDevtools.define();
    devtools.setStore(viewModels);
    return devtools;
  }
  static connectExtras(extras: AnyObject) {
    const devtools = ViewModelDevtools.define();
    devtools.setExtras(extras);
    return devtools;
  }
}
