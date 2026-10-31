import type { viewModelsConfig } from 'mobx-view-model';
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
    if (
      store.constructor === ViewModelStoreImpl ||
      typeof Reflect.get(store, 'viewModels')?.values !== 'function'
    )
      return;
    this.devtools.setStore(store);
  };
  private discover() {
    // Core 8–10 and 11 must keep their own factories and defaults.
    for (const hook of getHooks()) {
      if (this.hooks.has(hook)) continue;
      this.hooks.set(hook, hook.sub(this.connect));
      if (hook.lastPub?.[0]) this.connect(hook.lastPub[0]);
    }
  }
  private start = () => {
    if (this.timer !== undefined) return;
    this.discover();
    this.timer = setInterval(() => this.discover(), 500);
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
