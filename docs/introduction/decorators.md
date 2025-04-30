# MobX decorators and other

If you want to use decorators in your view models you need to configure your bundle.  
All next documentation contains code with accessor decorators which works using only with Babel. You can replace them with [`makeObservable`](https://mobx.js.org/observable-state.html#makeobservable), [`extendObservable`](https://mobx.js.org/api.html#extendobservable) MobX functions  

Base implementations of [`ViewModelStore`](/api/view-model-store/interface) and [`ViewModel`](/api/view-models/interface) are using `makeObservable(this)` in class constructor.   

<!-- 
## No decorators way   

Firstly you

```ts
import { ViewModelBase, ViewModelParams } from "mobx-view-model";
import { makeObservable, computed } from "mobx";

class YourVM extends ViewModelBase {
  constructor(params: ViewModelParams) {
    super(params);

    makeObservable(this, {
      monsters: computed
    });
  }

  get monsters() {
    return 100;
  }
}

```
 -->
