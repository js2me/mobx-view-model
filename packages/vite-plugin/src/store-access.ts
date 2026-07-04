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
 * The devtools bundles its own copy of MobX, so its computed properties
 * cannot observe the host app's ObservableMap (e.g. store.viewModels).
 * To bridge the two MobX instances, the runtime module imports `autorun`
 * from the HOST's `mobx` and sets up a reaction that watches the store's
 * `viewModels` map. When the map changes, the reaction calls
 * `devtools.notifyVmChange()`, which signals a MobX atom inside
 * the devtools' own MobX — forcing `allVms` to re-read the map.
 */
export function getRuntimeModuleSource(
  devtools?: boolean | DevtoolsConfig,
): string {
  const devtoolsEnabled = !!devtools;
  const devtoolsConfig: DevtoolsConfig =
    typeof devtools === 'object' ? devtools : {};

  const devtoolsImport = devtoolsEnabled
    ? `import { ViewModelDevtools } from 'mobx-view-model-devtools';`
    : '';

  const mobxBridgeImport = devtoolsEnabled
    ? `import { autorun } from 'mobx';`
    : '';

  const devtoolsSetup = devtoolsEnabled
    ? `
// Capture lastPub BEFORE define() — define() creates an internal
// ViewModelStoreImpl that overwrites lastPub with its own store
const __lastStoreBeforeDefine__ = __orig_storeCreate__.lastPub?.[0];

const __devtools__ = ViewModelDevtools.define({
  position: ${JSON.stringify(devtoolsConfig.position ?? 'top-right')},
  defaultIsOpened: ${JSON.stringify(devtoolsConfig.defaultIsOpened ?? false)},
});

ViewModelDevtools.connectExtras({ globalThis });

// The devtools' internal ViewModelStoreImpl — filter it out so only
// the project's store is connected
const __devtoolsInternalCtor__ = __devtools__.vmStore.constructor;

const __connectDevtools__ = (store) => {
  if (store.constructor !== __devtoolsInternalCtor__) {
    ViewModelDevtools.connectViewModels(store);
    // Bridge: use the HOST's autorun to watch the store's viewModels map.
    // When the map changes, notify the devtools so its own MobX
    // computed (allVms) re-reads the latest values.
    autorun(() => {
      // Reading .size tracks additions/removals in the HOST's MobX.
      // Iterating keys tracks key-level changes too.
      void (store).viewModels?.size;
      for (const _key of (store).viewModels?.keys() ?? []) { void _key; }
      __devtools__.notifyVmChange();
    });
  }
};

// Connect the project store that existed before define()
if (__lastStoreBeforeDefine__) {
  __stores__.push(__lastStoreBeforeDefine__);
  __connectDevtools__(__lastStoreBeforeDefine__);
}`
    : '';

  const devtoolsConnect = devtoolsEnabled
    ? `
  __connectDevtools__(store);`
    : '';

  return `import { viewModelsConfig } from 'mobx-view-model';
${devtoolsImport}
${mobxBridgeImport}

const __stores__ = [];

const __orig_storeCreate__ = viewModelsConfig.hooks.storeCreate;
${devtoolsSetup}

__orig_storeCreate__.sub((store) => {
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
