# MobX decorators and other

If you want to use decorators in your view models you need to configure your build.  
Most of the documentation uses accessor decorators that work only with Babel. You can replace them with [`makeObservable`](https://mobx.js.org/observable-state.html#makeobservable) or [`extendObservable`](https://mobx.js.org/api.html#extendobservable) from MobX.  

Base implementations of [`ViewModelStore`](/api/view-model-store/interface) and [`ViewModel`](/api/view-models/interface) are using `makeObservable(this)` in class constructor.   


## No-decorators approach   

You need to disable the "decorators style" for wrapping base entities with MobX functions like `makeObservable`.  
To achieve this, configure the [global `viewModelsConfig`](/api/view-models/view-models-config):  

```ts
import { viewModelsConfig } from "mobx-view-model";

viewModelsConfig.observable.viewModels.useDecorators = false;
```

Example of usage:
```ts
import { observable, action } from "mobx";
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

