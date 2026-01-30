---
title: View Model Store interface
---

# `ViewModelStore` interface   

Interface represeting a store for managing [`ViewModels`](/api/view-models/interface)  

::: tip OPTIONAL USE
This is not required for targeted usage of this package, but can be helpful for accessing [ViewModels](/api/view-models/overview) from everywhere by [ViewModelLookup](/api/other/view-model-lookup)  
:::

[Reference to source code](/src/view-model/view-model.store.ts)  

## Method and properties  


### `getIds(vmLookup)`  

Retrieves ids [ViewModels](/api/view-models/interface) based on [vmLookup](/api/other/view-model-lookup).  

#### Example  

```ts
vmStore.getIds(MyVM) // ["id"]
vmStore.getIds(ViewComponentOfMyVM) // ["id"]
```


### `getId(vmLookup)`  

Retrieves the `id` of the **last** [ViewModel](/api/view-models/interface) based on [vmLookup](/api/other/view-model-lookup).  

#### Example  

```ts
vmStore.getId(MyVM) // "id"
vmStore.getId(ViewComponentOfMyVM) // "id"
```

### `mountedViewsCount`  

The total number of views that are currently mounted.   

### `has(vmLookup)`  

Checks whether a [ViewModel](/api/view-models/interface) instance exists in the store.  
Requires [vmLookup](/api/other/view-model-lookup).  

### `get(vmLookup)`  

Retrieves the **last** [ViewModel](/api/view-models/interface) instance from the store based on [vmLookup](/api/other/view-model-lookup).  

:::tip
If you node more than one VM use [getAll(vmLookup)](#getallvmlookup) method  
:::    

#### Example

```ts
import { mobx-view-model } from "mobx-view-model";

class UserSelectVM extends ViewModelBase {
  selectedUser = {
    id: '1',
    name: 'John Doe'
  }
}

vmStore.get(UserSelectVM)?.selectedUser.id; // '1'
```

### `getAll(vmLookup)`  
Retrieves all [ViewModel](/api/view-models/overview) instances from the store based on [vmLookup](/api/other/view-model-lookup).  

### `markToBeAttached(viewModel)`  
Called when a [ViewModel](/api/view-models/overview) is about to be attached to the view.  
This is the first point where the created instance is passed to the store.  

### `attach(viewModel)`  
Attaches a [ViewModel](/api/view-models/overview) to the store.  

### `detach(viewModelId)`  
Detaches a [ViewModel](/api/view-models/overview) from the store using its ID.  

### `isAbleToRenderView(viewModelId)`  
Determines if a [ViewModel](/api/view-models/overview) is able to render based on its ID.  

### `createViewModel(config)`  
Creates a new [ViewModel](/api/view-models/overview) instance based on the provided configuration.  

Example:   
```ts
import {
  ViewModelStoreBase,
  ViewModel,
  ViewModelCreateConfig,
} from 'mobx-view-model';

export class ViewModelStoreImpl extends ViewModelStoreBase {
  createViewModel<VM extends ViewModel<any, ViewModel<any, any>>>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    const VM = config.VM;
    return new VM(config);
  }
}
```

### `processCreateConfig(config)`  
Process the configuration for creating a [ViewModel](/api/view-models/overview).  
This method is called just before creating a new [ViewModel](/api/view-models/overview) instance.  
It's useful for initializing the configuration, like linking components to the [ViewModel](/api/view-models/overview) class.  

### `linkComponents()`  
Link React components with [ViewModel](/api/view-models/overview) class.  

### `unlinkComponents()`   
Unlink React components with [ViewModel](/api/view-models/overview) class.  

### `generateViewModelId(config)`   
Generates a unique ID for a [ViewModel](/api/view-models/overview) based on the provided configuration.  

### `clean()`  
Clean up resources associated with the [ViewModel](/api/view-models/overview) store.  
Clean all inner data structures.  

