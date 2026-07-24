---
title: View Model Store base implementation
---

# `ViewModelStoreBase` class  

This is the base implementation of the [`ViewModelStore`](/api/view-model-store/interface) interface.  

[Reference to source code](/src/view-model/view-model.store.base.ts)  

## Methods and properties  
Here is documentation about **base implementation** methods and properties.  
If you need to read about [`ViewModelStore`](/api/view-model-store/interface) interface methods and properties, [go here](/api/view-model-store/interface).  

### `viewModels` (_protected_)  
Map structure with created [ViewModel](/api/view-models/overview) instances in application (`id` → instance).  

### `linkedAnchorVMClasses` (_protected_)  
Map from anchor / HOC component reference to the linked [ViewModel](/api/view-models/interface) class.  
Used so `get(MyComponent)` / `useViewModel(MyComponent)` resolve to the same instances as `get(MyVM)`.

### `viewModelIdsByClasses` (_protected_)  
Map from ViewModel class to the list of registered instance ids.

### `vmConfig`  
[ViewModelsConfig](/api/view-models/view-models-config)  

### `hasMountingVms`  
See [interface](/api/view-model-store/interface#hasmountingvms).

### `waitMount(...vms)`  
See [interface](/api/view-model-store/interface#waitmount-vms).

### `connect(instance, config)`  
Registers an already created instance in the store: links anchors, indexes the instance by id / class, and for [`ViewModelSimple`](/api/view-models/view-model-simple) calls `init(...)` when present.

### `define(config)`  
See [interface](/api/view-model-store/interface#define). Creates via [`create`](/api/view-model-store/interface#create-config) and then [`connect`](#connectinstance-config) when needed.

### `create(config)`  
See [interface](/api/view-model-store/interface#create-config). Uses `config.factory` or `vmConfig.factory`.

### `unmountNew(instance)`  
See [interface](/api/view-model-store/interface#unmountnewinstance).

### `attachVMConstructor(model)` / `dettachVMConstructor(model)` (_protected_)  
Maintain `viewModelIdsByClasses` so lookups by class work after connect / unmount.
