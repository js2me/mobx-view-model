# `ViewModelSimple`  

`ViewModelSimple` is a minimal contract aligned with the [ViewModel interface](/api/view-models/interface), designed for lightweight state management with **MobX**. It keeps reactive state initialization simple (for example, via `makeAutoObservable`) while still fitting the library lifecycle in React / Solid applications.  

[Reference to source code](/src/view-model/view-model-simple.ts)  

## API Signature

```ts
interface ViewModelSimple<Payload, ParentViewModel>
```

All members are optional except that you usually keep your own reactive state and actions.

| Member | Description |
| --- | --- |
| `id?: string` | Unique instance id. If omitted, the library assigns one. |
| `parentViewModel?: ParentViewModel` | Set automatically by the library when mounted under a parent VM. |
| `init?(config)` | Called when the instance is connected to a [`ViewModelStore`](/api/view-model-store/interface). |
| `mount?()` / `unmount?()` | Optional lifecycle hooks. |
| `setPayload?(payload)` | Optional payload updates from the view layer. |

## When to Use  
Use `ViewModelSimple` when:   
1. You need `direct control over MobX observability` (e.g., using `makeAutoObservable`)  
2. You prefer a simple, boilerplate-free class structure  
3. Your view model does not require advanced features like [`viewModels` access](/api/view-models/base-implementation.html#viewmodels) or complex lifecycle hooks.  

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
If you do not define the `id` property, a random id will be generated when the instance is registered in a store / created by the React / Solid integration.
:::

### Example without implementing any interface methods    

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

## <ReactMark /> Usage in React  

### <ReactMark /> Usage with [`withViewModel`](/react/api/with-view-model) HOC   

```tsx
import { observer } from "mobx-react-lite";
import { withViewModel } from "mobx-view-model-react";
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

### <ReactMark /> Usage with [`useCreateViewModel`](/react/api/use-create-view-model) hook   

```tsx
import { observer } from "mobx-react-lite";
import { useCreateViewModel } from "mobx-view-model-react";
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



### <ReactMark /> Accessing Instances  
To retrieve an existing instance elsewhere in your app:  
1. Use the [`useViewModel`](/react/api/use-view-model) hook.  
2. Ensure the instance is registered in a [`ViewModelStore`](/api/view-model-store/overview)  

## Usage in SolidJS

### Usage with [`withViewModel`](/solid/api/with-view-model) HOC

```tsx
import { withViewModel } from "mobx-view-model-solid";
import { FruitViewModel } from "./model";

export const FruitComponent = withViewModel(FruitViewModel, (props) => {
  return (
    <div>
      <p>Current fruit: {props.model.fruit}</p>
      <button onClick={() => props.model.setFruit("banana")}>
        Change to Banana
      </button>
    </div>
  );
});
```

### Usage with [`useCreateViewModel`](/solid/api/use-create-view-model) hook

```tsx
import { useCreateViewModel } from "mobx-view-model-solid";
import { FruitViewModel } from "./model";

export const FruitComponent = () => {
  const vm = useCreateViewModel(FruitViewModel);

  return (
    <div>
      <p>Current fruit: {vm.fruit}</p>
      <button onClick={() => vm.setFruit("banana")}>
        Change to Banana
      </button>
    </div>
  );
};
```

### Accessing instances

1. Use [`useViewModel`](/solid/api/use-view-model).
2. Register instances via [`ViewModelStore`](/api/view-model-store/overview) + [`ViewModelsProvider`](/solid/api/view-models-provider).
