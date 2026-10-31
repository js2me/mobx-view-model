import type { viewModelsConfig } from 'mobx-view-model';
import { ViewModelDevtools } from './model';
import { ViewModelStoreImpl } from './model/lib/view-model-store.impl';

type StoreCreateHook = typeof viewModelsConfig.hooks.storeCreate;

// Core 9/10 and core 11 keep separate configurations. Never alias them:
// their factories and defaults implement different lifecycle contracts.
const configKeys = [
  Symbol.for('VIEW_MODELS_CONFIG'),
  Symbol.for('@view-model@'),
];
const getStoreCreateHook = (key: symbol): StoreCreateHook | undefined =>
  Reflect.get(globalThis, key)?.hooks?.storeCreate;
const lastCreatedStores = configKeys.map(
  (key) => getStoreCreateHook(key)?.lastPub?.[0],
);

Object.assign(globalThis, {
  ViewModelDevtools,
});

ViewModelDevtools.define({
  position: 'top-right',
  defaultIsOpened: false,
});

ViewModelDevtools.connectExtras({
  globalThis,
});

const devtools = ViewModelDevtools.define();

const connectStore = (store: any) => {
  if (ViewModelStoreImpl === store.constructor) {
    return;
  }

  ViewModelDevtools.connectViewModels(store as any);
};

const subscribedHooks = new Set<StoreCreateHook>();
const discoverStores = () => {
  for (const key of configKeys) {
    const hook = getStoreCreateHook(key);
    if (!hook || subscribedHooks.has(hook)) continue;
    subscribedHooks.add(hook);
    hook.sub(connectStore);
    if (hook.lastPub?.[0]) connectStore(hook.lastPub[0]);
  }
};

discoverStores();
for (const store of lastCreatedStores) {
  if (store) connectStore(store);
}

// The UMD bundle has its own MobX. Poll identities, not just size, so
// replacing a VM between ticks also invalidates the inspector.
let previousVms: unknown[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
const check = () => {
  // A host loaded after the devtools may only now have created its config.
  discoverStores();
  const store = devtools.projectVmStore as any;
  const vms: unknown[] = [...(store?.viewModels?.values() ?? [])];
  if (
    vms.length !== previousVms.length ||
    vms.some((vm, index) => vm !== previousVms[index])
  ) {
    previousVms = vms;
    devtools.notifyVmChange();
  }
};
const start = () => {
  if (timer !== undefined) return;
  check();
  timer = setInterval(check, 500);
};
devtools.onPopupOpen(start);
devtools.onPopupClose(() => {
  clearInterval(timer);
  timer = undefined;
});
if (devtools.isPopupOpened) start();
