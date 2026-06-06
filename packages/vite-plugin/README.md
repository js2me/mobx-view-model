# mobx-view-model-vite-plugin

Vite plugin for [mobx-view-model](https://github.com/js2me/mobx-view-model) — smart HMR, auto `displayName` for observer components, and one-click devtools setup.

## Install

```bash
npm install mobx-view-model-vite-plugin
```

## Usage

```ts
// vite.config.ts
import { mobxVmVitePlugin } from 'mobx-view-model-vite-plugin';

export default {
  plugins: [mobxVmVitePlugin()],
};
```

All features are enabled by default in development. Nothing is injected in production builds.

## Features

### Smart HMR for ViewModel classes

Fixes [Error #2](https://js2me.github.io/mobx-view-model/errors/2) that occurs when Vite HMR replaces a ViewModel class module.

**The problem:** When you edit a ViewModel class (e.g. `CounterVM`), Vite creates a new class constructor. `withViewModel(NewCounterVM)` creates/reuses a VM instance, but `ViewModelStoreBase.viewModelIdsByClasses` still maps the **old** class to the VM IDs. When `useViewModel(NewCounterVM)` tries to look up the VM, it fails because the new class isn't in the map.

**The fix:** The plugin injects `import.meta.hot.dispose()` code into every ViewModel class file. On HMR update, it remaps:

- `viewModelIdsByClasses` — old class → new class
- `linkedAnchorVMClasses` — anchor → old class → anchor → new class
- VM instance prototypes — `Object.setPrototypeOf(instance, NewClass.prototype)`

No full page reload. State is preserved. `useViewModel()` continues to work after HMR.

The plugin also ensures that all consumer modules (files using `useViewModel(YourVM)` or `withViewModel(YourVM)`) are included in the HMR update, so they receive the new class reference.

### Auto `displayName` for observer components

Automatically sets `displayName` on all components wrapped in `observer()` from `mobx-react-lite` in development mode.

```tsx
// Before (no displayName in React DevTools)
const Header = observer(() => {
  return <div>Hello</div>;
});

// After plugin transform
const Header = observer(() => {
  return <div>Hello</div>;
});
Header.displayName = 'Header';
```

Works with named exports too:

```tsx
export const CounterBody = observer(() => <div>{model.clicks}</div>);
// → CounterBody.displayName = "CounterBody"
```

### Auto-connect devtools

Automatically connects [mobx-view-model-devtools](https://github.com/js2me/mobx-view-model-devtools) to your project. No manual setup required — the plugin subscribes to `viewModelsConfig.hooks.storeCreate` and connects the devtools panel whenever a `ViewModelStore` is created.

## Options

```ts
mobxVmVitePlugin({
  hmr: true, // Smart HMR for ViewModel classes
  autoDisplayName: true, // Auto displayName for observer() components
  devtools: false, // Auto-connect devtools (boolean or config object)
});
```

### `hmr`

**Type:** `boolean`  
**Default:** `true`

Enable smart HMR for ViewModel classes. When a ViewModel class file changes, the plugin remaps internal store references so `useViewModel()` continues to work without a full page reload.

### `autoDisplayName`

**Type:** `boolean`  
**Default:** `true`

Automatically inject `displayName` for all `observer()` wrapped components. Makes React DevTools more useful by showing component names instead of `Observer`.

### `devtools`

**Type:** `boolean | DevtoolsConfig`  
**Default:** `false`

Auto-connect `mobx-view-model-devtools`. Pass `true` for defaults, or an object to configure:

```ts
mobxVmVitePlugin({
  devtools: {
    position: 'top-right', // 'top-right' | 'top-left' | 'bottom-left' | 'bottom-right'
    defaultIsOpened: false, // whether the panel starts open
  },
});
```

## How it works

### HMR mechanism

1. The plugin scans `.ts`/`.tsx` files for ViewModel classes (extends `ViewModelBase`, implements `ViewModel`/`ViewModelSimple`)
2. It injects `import.meta.hot.dispose()` + class-remapping code into ViewModel class files
3. On first load, the injected code saves current class references via `import.meta.hot.data`
4. On HMR re-evaluation, it reads the old references, compares with new ones, and remaps the store's internal maps
5. The runtime module subscribes to `viewModelsConfig.hooks.storeCreate` to access `ViewModelStore` instances

### Store access

The plugin uses the official `viewModelsConfig.hooks.storeCreate` PubSub hook (the same mechanism used by `mobx-view-model-devtools`) to discover `ViewModelStore` instances. No monkey-patching or fragile internal hacks.

## License

MIT
