import type { DevtoolsConfig } from './types.js';

export const RUNTIME_MODULE_ID = '\0mobx-view-model-vite-plugin/runtime';
export const RUNTIME_MODULE_RESOLVED = '\0mobx-view-model-vite-plugin/runtime';

/**
 * The virtual module source that subscribes to ViewModelStore creation
 * via the official viewModelsConfig.hooks.storeCreate PubSub hook.
 * Exposes globalThis.__MOBX_VM_PLUGIN_STORES__ for HMR callbacks.
 * When devtools is enabled, also auto-connects mobx-view-model-devtools.
 *
 * ## Bridge pattern for MobX reactivity
 *
 * The devtools bundles its own copy of MobX (pre-built IIFE), so its
 * computed properties cannot observe the host app's ObservableMap.
 * To bridge the two MobX instances, the runtime module uses
 * `observe()` from the HOST's `mobx` to watch the store's
 * `viewModels` map.  When the map changes, a debounced call
 * to `devtools.notifyVmChange()` signals a MobX atom inside
 * the devtools — forcing `allVms` to re-read the map.
 *
 * IMPORTANT: We use `observe()` (not `reaction()`) because
 * `reaction()` creates a MobX derivation that participates in
 * endBatch processing.  When `attach()` runs inside a React
 * render (via useCreateViewModel), endBatch fires during the
 * render cycle, which can trigger forceStoreRerender on other
 * observer components — creating an infinite loop.  `observe()`
 * is a low-level listener that does NOT create a derivation and
 * does NOT participate in endBatch, so it avoids this problem.
 */
export function getRuntimeModuleSource(
  devtools?: boolean | DevtoolsConfig,
  debug?: boolean,
): string {
  const devtoolsEnabled = !!devtools;
  const devtoolsConfig: DevtoolsConfig =
    typeof devtools === 'object' ? devtools : {};
  const __log = debug
    ? `const __log = (...args) => console.log('[mobx-vm-vite-plugin/runtime]', ...args);`
    : `const __log = () => {};`;

  const devtoolsImport = devtoolsEnabled
    ? `import { ViewModelDevtools } from 'mobx-view-model-devtools';`
    : '';

  const mobxBridgeImport = devtoolsEnabled
    ? `import { observe } from 'mobx';`
    : '';

  const devtoolsSetup = devtoolsEnabled
    ? `
// Capture lastPub BEFORE define() — define() creates an internal
// ViewModelStoreImpl that overwrites lastPub with its own store
const __lastStoreBeforeDefine__ = __orig_storeCreate__.lastPub?.[0];

const __devtools__ = ViewModelDevtools.define({
  position: ${JSON.stringify(devtoolsConfig.position ?? 'top-right')},
  defaultIsOpened: ${JSON.stringify(devtoolsConfig.defaultIsOpened ?? false)},
  debug: ${!!debug},
});

ViewModelDevtools.connectExtras({ globalThis });

// The devtools' internal ViewModelStoreImpl — filter it out so only
// the project's store is connected
const __devtoolsInternalCtor__ = __devtools__.vmStore.constructor;

// Track the current bridge reaction disposer so we can dispose it before
// connecting to a newer store (e.g. React Strict Mode double-mount).
let __bridgeDispose__ = undefined;
// Debounce timer for the bridge effect — batches rapid VM additions
// into a single notifyVmChange() call.
let __notifyTimer__ = undefined;

const __connectDevtools__ = (store) => {
  __log('__connectDevtools__ called with store:', store?.constructor?.name, 'internalCtor:', __devtoolsInternalCtor__?.name, 'isSame:', store?.constructor === __devtoolsInternalCtor__);
  if (store.constructor !== __devtoolsInternalCtor__) {
    // Skip if the new store is empty but we already have a connected
    // store with VMs — prevents a fresh empty store (from re-render
    // creating new Globals()) from replacing the live one.
    const currentSize = __devtools__.projectVmStore?.viewModels?.size ?? 0;
    const newSize = store.viewModels?.size ?? 0;
    if (newSize === 0 && currentSize > 0) {
      __log('skipping empty store, current has', currentSize, 'VMs');
      return;
    }
    // Dispose the previous bridge reaction if one exists.
    if (__bridgeDispose__) {
      __log('disposing previous bridge reaction');
      __bridgeDispose__();
      __bridgeDispose__ = undefined;
    }
    // Clear any pending debounce timer from a previous bridge.
    clearTimeout(__notifyTimer__);
    ViewModelDevtools.connectViewModels(store);
    __log('connected devtools to store, viewModels.size:', store.viewModels?.size);

    // Bridge: use observe() + debounce instead of reaction().
    //
    // WHY NOT reaction()?  reaction() creates a MobX derivation that
    // participates in endBatch processing.  When attach() is called
    // inside a React render (useCreateViewModel), endBatch runs inside
    // the render cycle.  The bridge reaction's data function re-runs,
    // which can trigger forceStoreRerender on observer components —
    // creating an infinite loop: render → attach → endBatch →
    // reaction data fn → forceStoreRerender → re-render → new VM…
    //
    // observe() is a low-level listener that fires synchronously when
    // the ObservableMap changes but does NOT create a derivation and
    // does NOT participate in endBatch.  By debouncing the notification
    // to the next macrotask, we ensure notifyVmChange() runs outside
    // any React render cycle.
    __bridgeDispose__ = observe(store.viewModels, (change) => {
      if (change.type === 'add' || change.type === 'delete' || change.type === 'update') {
        __log('bridge observe:', change.type, change.name);
        clearTimeout(__notifyTimer__);
        __notifyTimer__ = setTimeout(() => {
          __log('bridge effect fn, calling notifyVmChange, size:', store.viewModels?.size);
          __devtools__.notifyVmChange();
        }, 50);
      }
    });
  }
};

// Connect the project store that existed before define()
if (__lastStoreBeforeDefine__) {
  __stores__.push(__lastStoreBeforeDefine__);
  __log('connecting lastStoreBeforeDefine, viewModels.size:', __lastStoreBeforeDefine__.viewModels?.size);
  __connectDevtools__(__lastStoreBeforeDefine__);
} else {
  __log('no lastStoreBeforeDefine found');
}`
    : '';

  const devtoolsConnect = devtoolsEnabled
    ? `
  __connectDevtools__(store);`
    : '';

  return `import { viewModelsConfig } from 'mobx-view-model';
${devtoolsImport}
${mobxBridgeImport}

${__log}

const __stores__ = [];

const __orig_storeCreate__ = viewModelsConfig.hooks.storeCreate;
${devtoolsSetup}

__orig_storeCreate__.sub((store) => {
  __log('storeCreate fired, store:', store?.constructor?.name, 'viewModels.size:', store.viewModels?.size);
  __stores__.push(store);${devtoolsConnect}
});

${
  !devtoolsEnabled
    ? `if (__orig_storeCreate__.lastPub?.[0]) {
  __stores__.push(__orig_storeCreate__.lastPub[0]);
}`
    : ''
}

globalThis.__MOBX_VM_PLUGIN_STORES__ = __stores__;
`;
}
