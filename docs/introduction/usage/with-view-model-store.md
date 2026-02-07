# Usage with View Model Store

ViewModelStore lets you access your view model instances from anywhere and gives you more control over creating them.  
Follow the simplest way to add a view model store to your application:  

##### **1.** Create a class implementing the [ViewModelStore interface](/api/view-model-store/interface) or use [basic library implementation (ViewModelStoreBase)](/api/view-model-store/base-implementation).  

```tsx title="/src/shared/lib/mobx/view-model-store.ts"
import { ViewModelStoreBase } from "mobx-view-model";

class MyViewModelStore extends ViewModelStoreBase {}
```

##### **2.** Create an instance of the [ViewModelStore](/api/view-model-store/overview)  

```ts
const viewModelStore = new MyViewModelStore() // or new ViewModelStoreBase
```

##### **3.** Integrate with [React](https://react.dev/) using [`ViewModelsProvider`](/react/api/view-models-provider) at the root of your application  

```tsx
<ViewModelsProvider value={viewModelStore}>
...
</ViewModelsProvider>
```

##### **4.** Get access to `ViewModelStore` inside your `ViewModels`   

```ts
import { ViewModelBase } from "mobx-view-model";
import { ParentVM } from "../parent-vm";
import { ChildVM } from "../child-vm";
import { AppLayoutVM } from "@/app-layout"

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



