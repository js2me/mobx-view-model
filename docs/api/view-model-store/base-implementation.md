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
Map structure with created [ViewModel](/api/view-models/overview) instances in application.  

### `instanceAttachedCount` (_protected_)  
[ViewModel](/api/view-models/interface) instances count attached ([method attach()](/api/view-model-store/interface#attachviewmodel)) to current store  

### `mountingViews` (_protected_)  
A `Set` with [ViewModel](/api/view-models/overview) ids which views are waiting for mount

### `unmountingViews` (_protected_)  
A `Set` with [ViewModel](/api/view-models/overview) ids which views are waiting for unmount

### `viewModelsTempHeap` (_protected_)  
A `Map` with temp heap vm instances  
Is needed to get access to view model instance before all initializations happens  

### `vmConfig` (_protected_)  
[ViewModelsConfig](/api/view-models/view-models-config)  

