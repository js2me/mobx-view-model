# MobX decorators and other

If you want to use decorators in your view models you need to configure your bundle.  
All next documentation contains code with accessor decorators which works using only with Babel. You can replace them with [`makeObservable`](https://mobx.js.org/observable-state.html#makeobservable), [`extendObservable`](https://mobx.js.org/api.html#extendobservable) MobX functions  

Base implementations of [`ViewModelStore`](/api/view-model-store/interface) and [`ViewModel`](/api/view-models/interface) are using `makeObservable(this)` in class constructor.   


## No decorators way   

You need to disable "decorators style" of wrapping base entities into `MobX` functions like `makeObservable`.  
To achieve this you need to configure [global `viewModelsConfig`](/api/view-models/view-models-config):  

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

