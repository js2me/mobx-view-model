# Usage with View Model Store

`ViewModelStore` owns view model instances and lets registered view models look up one another. Add it when several components need to share or find the same instances.

## 1. Create a store

```tsx title="/src/shared/lib/mobx/view-model-store.ts"
import { ViewModelStoreBase } from "mobx-view-model";

export class MyViewModelStore extends ViewModelStoreBase {}
```

## 2. Create one application-level instance

```ts
export const viewModelStore = new MyViewModelStore();
```

## <ReactMark /> 3. Provide the store to React

```tsx
import { ViewModelsProvider } from 'mobx-view-model-react';
import { viewModelStore } from './view-model-store';

export function App() {
  return (
<ViewModelsProvider value={viewModelStore}>
  {/* application */}
</ViewModelsProvider>
  );
}
```

## 4. Access other registered ViewModels

```ts
import { ViewModelBase } from "mobx-view-model";
import { ParentVM } from "../parent-vm";
import { ChildVM } from "../child-vm";
import { AppLayoutVM } from "@/app-layout";

export class YourVM extends ViewModelBase {
  get parentData() {
    return this.viewModels.get(ParentVM)?.data;
  }

  get childData() {
    return this.viewModels.get(ChildVM)?.data;
  }

  get appLayoutData() {
    return this.viewModels.get(AppLayoutVM)?.data;
  }
}
```


