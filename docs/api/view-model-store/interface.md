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

### `resource`

Optional data source scoped to this store. The React integration calls
`resource.read(viewModelId)` while creating a view model and passes the returned
value to the view model as `vmData`. This is useful for data that belongs to a
single request during SSR: create a new store for each request instead of
putting request data in the global configuration.

`read` follows the React Suspense resource convention:

- return data when it is already available;
- throw a `Promise` while the data is loading;
- throw an `Error` when loading fails.

The store resource takes precedence over [`viewModelsConfig.resource`](/api/view-models/view-models-config#resource).

#### Example: request-scoped resource

```tsx
import {
  ViewModelBase,
  ViewModelStoreBase,
  type ViewModelResource,
} from 'mobx-view-model';
import { ViewModelsProvider, useCreateViewModel } from 'mobx-view-model-react';

type UserData = { id: string; name: string };

function createRequestStore(
  requestUsers: Map<string, UserData>,
  loadUser: (id: string) => Promise<void>,
) {
  const resource: ViewModelResource<UserData> = {
    read(id) {
      const user = requestUsers.get(id);
      if (!user) throw loadUser(id); // React Suspense retries after the promise settles
      return user;
    },
  };

  return new ViewModelStoreBase({ resource });
}

class UserVM extends ViewModelBase {
  get user(): UserData {
    return this.vmData as UserData;
  }
}

function UserView() {
  const user = useCreateViewModel(UserVM, undefined, { id: 'user-42' });
  return <div>{user.user.name}</div>;
}

export function RequestApp() {
  const store = createRequestStore(requestUsers, loadUser);

  return (
    <ViewModelsProvider value={store}>
      <UserView />
    </ViewModelsProvider>
  );
}
```

`requestUsers` and `loadUser` are application code. The important part is that
the resource closes over data for one request and is passed to that request's
store. The same store can be shared by all view models rendered for that
request.

#### Example: global fallback with a store override

```ts
import { viewModelsConfig, ViewModelStoreBase } from 'mobx-view-model';

viewModelsConfig.resource = globalCacheResource;

const requestStore = new ViewModelStoreBase({
  resource: requestCacheResource, // used instead of globalCacheResource
});
```

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
