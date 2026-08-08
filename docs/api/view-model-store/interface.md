---
title: View Model Store interface
---

# `ViewModelStore` interface   

Interface representing a store for managing [`ViewModels`](/api/view-models/interface)  

::: tip OPTIONAL USE
This is not required for targeted usage of this package, but can be helpful for accessing [ViewModels](/api/view-models/overview) from everywhere by [ViewModelLookup](/api/other/view-model-lookup)  
:::

[Reference to source code](/src/view-model/view-model.store.ts)  

## Method and properties  

### `vmConfig`  

Effective merged [`ViewModelsConfig`](/api/view-models/view-models-config) for this store: values from the store constructor are layered over the global defaults.  

### `getIds(vmLookup)`  

Retrieves ids of [ViewModels](/api/view-models/interface) based on [vmLookup](/api/other/view-model-lookup).  

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

The total number of views that are currently mounted. Counts **committed** store entries only — VMs registered via [`defineStaged`](#definestaged-config-owner) are not counted until committed.

### `hasMountingVms`  

`true` while at least one registered full [`ViewModel`](/api/view-models/interface) is not yet mounted (`isMounted === false`). Counts **committed** store entries only.

### `waitMount(...vms)`  

Returns a `Promise` that resolves when the given view models are mounted.  
If no arguments are passed, waits until **all** registered full view models are mounted. Observes **committed** store entries only.

### `has(vmLookup)`  

Checks whether a [ViewModel](/api/view-models/interface) instance exists in the store.  
Requires [vmLookup](/api/other/view-model-lookup).  

### `get(vmLookup)`  

Retrieves the **last** [ViewModel](/api/view-models/interface) instance from the store based on [vmLookup](/api/other/view-model-lookup).  

When `vmLookup` is a component created with [`withViewModel`](/react/api/with-view-model) (or branded via [`ViewModelComponentRef`](/api/other/view-model-lookup)), TypeScript infers the concrete VM type.

:::tip
If you need more than one VM, use [getAll(vmLookup)](#getall-vmlookup) method  
:::    

#### Example

```ts
import { ViewModelBase } from "mobx-view-model";

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

### `define(config)`  
Recommended way to obtain a VM from the store: returns the existing instance if one with the same ID is already registered, otherwise creates a new instance, connects it to the store, and returns it.

Replaces the manual `generateId` → `get` → `create` → `connect` flow.

### `defineStaged(config, owner)`  

Staging variant of [`define(config)`](#define-config): creates (or returns) the instance and makes it visible to store lookups immediately (read-through), but does **not** commit it as a store entry until [`commitStaged(id, instance)`](#commitstaged-id-instance) is called. If `owner` is garbage-collected without committing (e.g. a React fiber discarded during a render pass), the staged entry is dropped automatically.

Used by view-layer integrations (React) to keep render-phase registration safe: work done for a discarded render never becomes committed store state. Optional — implemented by [`ViewModelStoreBase`](/api/view-model-store/base-implementation); integrations feature-detect it and fall back to `define` otherwise.

### `commitStaged(id, instance)`  

Promotes a staged view model to a committed store entry. Safe to call with an instance whose staged entry is already gone — the instance is simply (re)registered as committed. Must be called only from commit-phase code (effects), never during render.

### `dropStaged(id, instance)`  

Drops a staged entry if it still belongs to the given instance (the identity check protects against id reuse).

### `create(config)`  
Creates a new [ViewModel](/api/view-models/overview) instance based on the provided configuration (does **not** register it in the store by itself).  

Example:   
```ts
import {
  ViewModelStoreBase,
  ViewModel,
  ViewModelCreateConfig,
} from 'mobx-view-model';

export class ViewModelStoreImpl extends ViewModelStoreBase {
  create<VM extends ViewModel>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    const VM = config.VM;
    return new VM(config);
  }
}
```

### `unmount(instance)`  
Unmounts the instance (if it has `unmount`) and removes it from the store indexes.

### `link()`  
Links anchors (React / Solid components) with [ViewModel](/api/view-models/overview) class.  

### `unlink()`   
Unlinks anchors (React / Solid components) with [ViewModel](/api/view-models/overview) class.  

### `generateId(config)`   
Generates a unique ID for a [ViewModel](/api/view-models/overview) based on the provided configuration.  
In [`ViewModelStoreBase`](/api/view-model-store/base-implementation) the default implementation returns `config.id`.

### `clean()`  
Cleans up resources associated with the [ViewModel](/api/view-models/overview) store.  
Cleans all inner data structures.  
