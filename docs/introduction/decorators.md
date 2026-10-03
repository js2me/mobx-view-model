# MobX decorators

If you use decorators in your view models, configure your TypeScript or Babel build to support the decorator syntax you chose. You can also avoid decorators entirely with [`makeObservable`](https://mobx.js.org/observable-state.html#makeobservable).

Base implementations of [`ViewModelStore`](/api/view-model-store/interface) and [`ViewModel`](/api/view-models/interface) are using `makeObservable(this)` in class constructor.   


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
