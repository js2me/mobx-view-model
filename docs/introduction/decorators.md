# MobX decorators

If you use decorators in your view models, configure your TypeScript or Babel build to support the decorator syntax you chose. You can also avoid decorators entirely with [`makeObservable`](https://mobx.js.org/observable-state.html#makeobservable).

Base implementations of [`ViewModelStore`](/api/view-model-store/interface) and [`ViewModel`](/api/view-models/interface) are using `makeObservable(this)` in class constructor.   

## Vite with SWC

To use standard decorators such as `@observable accessor` with Vite, install [`swc-decorators-plugin`](https://github.com/js2me/swc-decorators-plugin) and add it to your Vite plugins:

```bash
pnpm add -D swc-decorators-plugin
pnpm add @swc/helpers
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { swcDecoratorsPlugin } from "swc-decorators-plugin";

export default defineConfig({
  plugins: [
    swcDecoratorsPlugin({
      decoratorVersion: "2022-03",
      target: "es2024",
      useDefineForClassFields: true,
      externalHelpers: true,
    }),
  ],
});
```

If your Vite config already has plugins, add `swcDecoratorsPlugin(...)` to the existing `plugins` array. `@swc/helpers` is needed here because `externalHelpers` is enabled.

## No-decorators approach   

Disable decorator-based wrapping in the [global `viewModelsConfig`](/api/view-models/view-models-config) before creating any view models:

```ts
import { viewModelsConfig } from "mobx-view-model";

viewModelsConfig.observable.viewModels.useDecorators = false;
```

Example of usage:
```ts
import { observable, action, makeObservable } from "mobx";
import { ViewModelBase, ViewModelParams } from "mobx-view-model";

class YourViewModel extends ViewModelBase  {
  constructor(params: ViewModelParams) {
    super(params);

    makeObservable(this, {
      fruitName: observable,
      setFruitName: action.bound,
    })
  }

  fruitName: string = '';

  setFruitName(fruitName: string) {
    this.fruitName = fruitName;
  }
}
```
