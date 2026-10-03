---
title: View Model Store base implementation
---

# `ViewModelStoreBase` class  

This is the base implementation of the [`ViewModelStore`](/api/view-model-store/interface) interface.  

[Reference to source code](https://github.com/js2me/mobx-view-model/blob/master/packages/core/src/view-model/view-model.store.base.ts)

## Methods and properties  
Here is documentation about **base implementation** methods and properties.  
If you need to read about [`ViewModelStore`](/api/view-model-store/interface) interface methods and properties, [go here](/api/view-model-store/interface).  

### `viewModels` (_protected_)  
Map structure with created [ViewModel](/api/view-models/overview) instances in application (`id` → instance).  

### `viewModelIdsByClasses` (_protected_)  
Map from ViewModel class to the list of registered instance ids.

### `linkedAnchorVMClasses` (_protected_)
Map from component anchors to their ViewModel classes, used for lookups by component.

### `vmConfig`  
Effective [ViewModelsConfig](/api/view-models/view-models-config), merged from global defaults and store options.

### `resource`
Store-scoped data source for view models. Defaults to the resource in `vmConfig` when no store resource is supplied. See the [interface documentation](/api/view-model-store/interface#resource).

### `connect(instance, config)`  
Registers an already created instance in the store: links anchors, indexes the instance by ID and class, and calls `init(...)` when present. It does not call `mount()`.

### `define(config)`  
See [interface](/api/view-model-store/interface#define-config). Generates an ID and returns an existing instance with that ID, or creates one via [`create`](/api/view-model-store/interface#create-config) and registers it via [`connect`](#connect-instance-config).

### `create(config)`  
See [interface](/api/view-model-store/interface#create-config). Uses `config.factory` or `vmConfig.factory`.

### `unmount(instance)`  
See [interface](/api/view-model-store/interface#unmount-instance).

### `clean()`
Clears the store's instance, class, and anchor indexes. It does not call `unmount()` on the instances.

### `attachVMConstructor(model)` / `dettachVMConstructor(model)` (_protected_)  
Maintain `viewModelIdsByClasses` so lookups by class work after connect / unmount.
