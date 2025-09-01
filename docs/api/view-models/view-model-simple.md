# `ViewModelSimple`  

`ViewModelSimple` is a minimalistic implementation of the [ViewModel interface](/api/view-models/interface), designed for lightweight state management with **MobX**. It simplifies reactive state initialization using `makeAutoObservable` while enforcing a consistent instance lifecycle in React applications.  

[Reference to source code](/src/view-model/view-model-simple.ts)  

## When to Use  
Use `ViewModelSimple` when:   
1. You need `direct control over MobX observability` (e.g., using `makeAutoObservable`)  
2. You prefer a simple, boilerplate-free class structure  
3. Your view model does not required advanced features like [`viewModels` access](/api/view-models/base-implementation.html#viewmodels) or complex lifecycle hooks.  

### Example   
```ts
import { ViewModelSimple } from "mobx-view-model";
import { makeAutoObservable } from "mobx";

export class FruitViewModel implements ViewModelSimple {
  // Unique instance identifier
  id = crypto.randomUUID(); 

  // Observable state
  fruit = "apple";

  constructor() {
    // Initialize MobX observables
    makeAutoObservable(this);
  }

  // Example action
  setFruit(newFruit: string) {
    this.fruit = newFruit;
  }
}
```

::: tip defining `id` property is optional
If you do not define the `id` property, a random id will be generated from `viewModelsConfig.generateId`
:::

### Example without any implemented method from interface    

```ts{4}
import { ViewModelSimple } from "mobx-view-model";
import { makeAutoObservable } from "mobx";

export class FruitViewModel {
  // Observable state
  fruit = "apple";

  constructor() {
    // Initialize MobX observables
    makeAutoObservable(this);
  }

  // Example action
  setFruit(newFruit: string) {
    this.fruit = newFruit;
  }
}
```

::: tip `implements ViewModelSimple` was removed
Because TypeScript throws an error about not implementing at least one property or method of the `ViewModelSimple` interface.
:::

## Usage in React  

### Usage with [`withViewModel`](/react/api/with-view-model) HOC   

```tsx
import { observer } from "mobx-react-lite";
import { withViewModel } from "mobx-view-model";
import { FruitViewModel } from "./model";

export const FruitComponent = withViewModel(FruitViewModel, ({ model }) => {
  return (
    <div>
      <p>Current fruit: {model.fruit}</p>
      <button onClick={() => model.setFruit("banana")}>
        Change to Banana
      </button>
    </div>
  );
});
```

### Usage with [`useCreateViewModel`](/react/api/use-create-view-model) hook   

```tsx
import { observer } from "mobx-react-lite";
import { useCreateViewModel } from "mobx-view-model";
import { FruitViewModel } from "./model";

export const FruitComponent = observer(() => {
  // Creates a single instance per component mount
  const vm = useCreateViewModel(FruitViewModel);

  return (
    <div>
      <p>Current fruit: {vm.fruit}</p>
      <button onClick={() => vm.setFruit("banana")}>
        Change to Banana
      </button>
    </div>
  );
});
```



### Accessing Instances  
To retrieve an existing instance elsewhere in your app:  
1. Use the [`useViewModel`](/react/api/use-view-model) hook.  
2. Ensure the instance is registered in a [`ViewModelStore`](/api/view-model-store/overview)  

