# View Model Lookup

### `ViewModelLookup`, `vmLookup`  
This type is declaration of which data is needed to find your [ViewModel](/api/view-models/overview) instance in [`ViewModelStore`](/api/view-model-store/overview)  

It can be:   
  - [ViewModel id](/api/view-models/interface#id-string)  
  - `ViewModel class reference`  
  - [`React`](https://react.dev) component created with [`withViewModel()`](/react/api/with-view-model)  
  - Anchor component registered via [config `anchors`](/react/api/with-view-model#anchors) or method [`connect()`](/react/api/with-view-model#connectanchor)  

[Reference to source code type](/src/view-model/view-model.store.types.ts#L42)  
[Reference to source code with internal usage of this value](/src/view-model/view-model.store.base.ts#L220)  

# Example   

_This example represents scenario if you are not using [API for integration with React](/react/integration)._  

```ts
import { ViewModelStoreBase, ViewModelBase } from "mobx-view-model"

const vmStore = new ViewModelStoreBase();


class MyVM extends ViewModelBase {
  constructor() {
    super({ id: '1', payload: {} });
  }
}

const vm = new MyVM();
...
await vmStore.attach(vm) // this is required thing
...
vmStore.get(vm.id) // instance of MyVM
...
```

