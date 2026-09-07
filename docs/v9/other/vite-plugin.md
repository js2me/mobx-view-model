# Vite plugin   
This library has a `Vite` plugin that **can** improve DX when using it.   
    

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


## Usage   

Open your `vite.config.ts` and add this plugin.  

```ts{1,4-6}
import { mobxViewModel } from "mobx-view-model-vite-plugin";
...
  plugins: [
    mobxViewModel({
      reloadOnChangeViewModel: true
    })
  ]
...
```

## Features  

### `reloadOnChangeViewModel`   

This option reloads the page after your `ViewModel` changes.    