# View Model Lookup

### `ViewModelLookup`, `vmLookup`  
This type declares what data is needed to find your [ViewModel](/api/view-models/overview) instance in [`ViewModelStore`](/api/view-model-store/overview).  

It can be:   
  - [ViewModel id](/api/view-models/interface#id-string)  
  - `ViewModel` / `ViewModelSimple` class reference  
  - Component created with [`withViewModel()`](/react/api/with-view-model) / Solid equivalent (typed via `ViewModelComponentRef<T>` so `get(Component)` infers `T`)  
  - Anchor component registered via [config `anchors`](/react/api/with-view-model#anchors) or method [`connect()`](/react/api/with-view-model#connectanchor)  

[Reference to source code type](/src/view-model/view-model.store.types.ts)  

### `ViewModelComponentRef<T>`  
Type-only brand used by framework packages so [`get`](/api/view-model-store/interface#get-vmlookup) / [`useViewModel`](/react/api/use-view-model) can infer the concrete ViewModel type from a HOC component reference. Never read at runtime.

# Example   

_This example represents a scenario where you are not using the [React integration API](/react/integration)._  

```ts
import { ViewModelStoreBase, ViewModelBase } from "mobx-view-model"

const vmStore = new ViewModelStoreBase();

class MyVM extends ViewModelBase {
  constructor() {
    super({ id: '1', payload: {} });
  }
}

const vm = vmStore.define({
  id: '1',
  payload: {},
  VM: MyVM,
});

vmStore.get(vm.id) // instance of MyVM
vmStore.get(MyVM) // instance of MyVM
```
