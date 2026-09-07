# Vite plugin

A Vite plugin that makes working with mobx-view-model smoother: smart HMR, automatic `displayName` for observer components, and one-click devtools setup.

## Installation

::: code-group

```bash [npm]
npm install mobx-view-model-vite-plugin
```

```bash [pnpm]
pnpm add mobx-view-model-vite-plugin
```

```bash [yarn]
yarn add mobx-view-model-vite-plugin
```

:::

## Setup

Add the plugin to your `vite.config.ts`:

```ts
import { mobxVmVitePlugin } from "mobx-view-model-vite-plugin";

export default {
  plugins: [mobxVmVitePlugin()],
};
```

All features are on by default in dev mode. The plugin injects nothing in production builds.

## Features

### Smart HMR for ViewModel classes

Fixes [Error #2](/errors/2) that shows up when Vite HMR replaces a ViewModel class module.   


### Auto `displayName` for observer components

In dev mode, the plugin automatically sets `displayName` on every component wrapped in `observer()` from `mobx-react-lite`.

```tsx
// Before (no name in React DevTools)
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

The plugin hooks up [mobx-view-model-devtools](https://github.com/js2me/mobx-view-model-devtools) for you — no manual setup. It subscribes to `viewModelsConfig.hooks.storeCreate` and connects the devtools panel whenever a `ViewModelStore` is created.

## Options

```ts
mobxVmVitePlugin({
  hmr: true, // smart HMR for ViewModel classes
  autoDisplayName: true, // auto displayName for observer() components
  devtools: false, // auto-connect devtools (boolean or config object)
});
```

### `hmr`

- **Type:** `boolean`
- **Default:** `true`

Enables smart HMR for ViewModel classes. When a ViewModel class file changes, the plugin remaps internal store references so `useViewModel()` keeps working without a full page reload.

### `autoDisplayName`

- **Type:** `boolean`
- **Default:** `true`

Automatically injects `displayName` for all `observer()`-wrapped components. Instead of `Observer` in React DevTools, you'll see the actual component name.

### `devtools`

- **Type:** `boolean | DevtoolsConfig`
- **Default:** `false`

Auto-connects `mobx-view-model-devtools`. Pass `true` for defaults, or an object to configure:

```ts
mobxVmVitePlugin({
  devtools: {
    position: 'top-right', // 'top-right' | 'top-left' | 'bottom-left' | 'bottom-right'
    defaultIsOpened: false, // whether the panel starts open
  },
});
```
