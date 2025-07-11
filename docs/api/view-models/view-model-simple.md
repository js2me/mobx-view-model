# `ViewModelSimple`  

`ViewModelSimple` is a minimalistic implementation of the [ViewModel interface](/api/view-models/interface), designed for lightweight state management with **MobX**. It simplifies reactive state initialization using `makeAutoObservable` while enforcing a consistent instance lifecycle in React applications.  

[Reference to source code](/src/view-model/view-model-simple.ts)  

## When to Use  
Use `ViewModelSimple` when:   
1. You need `direct control over MobX observability` (e.g., using `makeAutoObservable`)  
2. You prefer a simple, boilerplate-free class structure  
3. Your view model does not required advanced features like [`viewModels` access](/api/view-models/base-implementation.html#viewmodels) or complex lifecycle hooks.  

## Implementation  

### Requirements   
To implement `ViewModelSimple`, your class must:   
1. Define a unique `id` property to identify the instance (used for access in `ViewModelStore`)   


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

## Usage in React  

### Instance creation  

Create instances using the [`useCreateViewModel`](/react/api/use-create-view-model) hook. This ensures proper lifecycle management and reactivity:   

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

