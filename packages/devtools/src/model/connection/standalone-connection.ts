import type { ViewModelStoreBase, viewModelsConfig } from 'mobx-view-model';
import { ViewModelStoreImpl } from '../lib/view-model-store.impl';
import type { ViewModelDevtools } from '../view-model-devtools';

type StoreHook = typeof viewModelsConfig.hooks.storeCreate;
const CONFIG_KEYS = [
  Symbol.for('VIEW_MODELS_CONFIG'),
  Symbol.for('@view-model@'),
];
const getHooks = (): StoreHook[] =>
  CONFIG_KEYS.flatMap((key) => {
    const hook = Reflect.get(globalThis, key)?.hooks?.storeCreate;
    return hook ? [hook] : [];
  });

export function captureProjectStores() {
  return getHooks().flatMap((hook) =>
    hook.lastPub?.[0] ? [hook.lastPub[0]] : [],
  );
}

/** The host and the standalone bundle may have independent MobX runtimes. */
export class StandaloneConnection {
  private readonly hooks = new Map<StoreHook, () => void>();
  private readonly disposers: Array<() => void>;
  private previousVms: unknown[] = [];
  private previousParents: unknown[] = [];
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly devtools: ViewModelDevtools,
    initialStores: ReturnType<typeof captureProjectStores>,
  ) {
    this.discover();
    for (const store of initialStores) this.connect(store);
    this.disposers = [
      devtools.onPopupOpen(this.start),
      devtools.onPopupClose(this.stop),
    ];
    devtools.abortSignal.addEventListener('abort', () => this.destroy(), {
      once: true,
    });
    if (devtools.isPopupOpened) this.start();
  }
  private connect = (store: Parameters<StoreHook>[0]) => {
    if (store.constructor === ViewModelStoreImpl) return;
    this.devtools.setStore(store as ViewModelStoreBase);
  };
  private discover() {
    // Core 9/10 and 11 must keep their own factories and defaults.
    for (const hook of getHooks()) {
      if (this.hooks.has(hook)) continue;
      this.hooks.set(hook, hook.sub(this.connect));
      if (hook.lastPub?.[0]) this.connect(hook.lastPub[0]);
    }
  }
  private check = () => {
    this.discover();
    const vms = this.devtools.inspector.readViewModels();
    if (
      vms.length !== this.previousVms.length ||
      vms.some(
        (vm, index) =>
          vm !== this.previousVms[index] ||
          vm.parentViewModel !== this.previousParents[index],
      )
    ) {
      this.previousVms = vms;
      this.previousParents = vms.map((vm) => vm.parentViewModel);
      this.devtools.notifyVmChange();
    }
  };
  private start = () => {
    if (this.timer !== undefined) return;
    this.check();
    this.timer = setInterval(this.check, 500);
  };
  private stop = () => {
    clearInterval(this.timer);
    this.timer = undefined;
  };
  destroy() {
    this.stop();
    for (const dispose of this.disposers) dispose();
    for (const dispose of this.hooks.values()) dispose();
    this.hooks.clear();
  }
}
