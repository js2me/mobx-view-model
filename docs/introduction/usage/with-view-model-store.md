# Usage with View Model Store

`ViewModelStore` registers view model instances and lets them look up one another. Add it when components need to find registered instances by class, component, or ID.

## 1. Create a store

```tsx title="/src/shared/lib/mobx/view-model-store.ts"
import { ViewModelStoreBase } from "mobx-view-model";

export class MyViewModelStore extends ViewModelStoreBase {}
```

## 2. Create an application-level instance

For SSR, create the store per request instead of sharing an application-level instance across requests.

```ts title="/src/shared/lib/mobx/index.ts"
import { MyViewModelStore } from './view-model-store';

export const viewModelStore = new MyViewModelStore();
```

## <ReactMark /> 3. Provide the store to React

```tsx
import { ViewModelsProvider } from 'mobx-view-model-react';
import { viewModelStore } from '@/shared/lib/mobx';

export function App() {
  return (
    <ViewModelsProvider value={viewModelStore}>
      {/* application */}
    </ViewModelsProvider>
  );
}
```

## 4. Access other registered ViewModels

The components that create these view models must be rendered under the same provider. The store's `get()` returns `null` until an instance is registered; React's `useViewModel()` throws if it cannot find the requested instance.

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
