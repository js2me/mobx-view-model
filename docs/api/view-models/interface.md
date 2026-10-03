---
title: View Model interface
---

# `ViewModel` interface  

Interface that defines the core functionality for implementing the MVVM pattern in your application.  
All code examples will include the [base implementation](/api/view-models/base-implementation) of this interface.  

[Reference to source code](/src/view-model/view-model.ts)  

## API Signature  
```ts
interface ViewModel<Payload, ParentViewModel>
```

## Generics  

### 1. `Payload`  
Declares the payload data type for your `ViewModel`.
Used for transferring data between view models or views.  
Must be an object type or `EmptyObject` for no payload.

### 2. `ParentViewModel`   
Declares the parent `ViewModel` / `ViewModelSimple` type where current `ViewModel` is rendered in the component hierarchy.  
Enables access to parent view model through the `parentViewModel` property.  
Optional, defaults to `null` if not specified.

## Core Properties  

### `id: string`  
Unique identifier for the view model instance.  
Used for tracking and managing view model lifecycle.

### `payload: Payload`  
Data object passed from the parent component to the view model.  

### `vm: ViewModelInfo`
Metadata exposed by the view model. Its `state` describes the current lifecycle
state, and `data` contains data returned by the configured
[`ViewModelResource`](/api/view-models/view-models-config#resource) for this
view model's `id` (or `undefined` when no resource is configured).

```ts
import { ViewModelBase } from 'mobx-view-model';

type Product = { id: string; title: string };

class ProductVM extends ViewModelBase {
  get product(): Product {
    return this.vm.data as Product;
  }
}
```

### `isMounted: boolean`  
Indicates whether the `ViewModel` is currently mounted with its associated component.  
Controls the rendering of the connected view component:
- `true`: Component is rendered
- `false`: Component is not rendered

### `vm.state: ViewModelLifecycleState`
The current lifecycle state of the `ViewModel`, exposed through `vm`. Possible values:

| State | Description |
|---|---|
| `'init'` | Instance created, `mount()` not yet called |
| `'mounting'` | `mount()` is in progress (async `willMount()` running) |
| `'mounted'` | Fully mounted, `isMounted` is `true` |
| `'hydrated'` | Hydrated from SSR data; `isMounted` is `true` |
| `'unmounting'` | `unmount()` started |
| `'unmounted'` | Fully unmounted |

`vm.state` is a MobX `observable.ref` — you can observe it in reactions or use
it to distinguish between `init` (not yet mounted) and `mounting` (mount in
progress), which `isMounted` alone cannot do. The `vm` metadata object also
exposes resource data as `vm.data`.

### `parentViewModel: ParentViewModel`   
Reference to the parent `ViewModel` in the component hierarchy.  

::: warning   
This property is only available when using:
- [`ViewModelStore`](/api/view-model-store/interface) (integrated with [ViewModelsProvider](/react/api/view-models-provider))
- [`withViewModel` HOC](/react/api/with-view-model)
:::

#### Example: Parent-Child ViewModel Communication   
```ts
import { ViewModelBase } from "mobx-view-model";

class ParentVM extends ViewModelBase {
  foo = 'bar'
}

class ChildVM extends ViewModelBase<{}, ParentVM> {
  get baz() {
    return this.parentViewModel?.foo; // 'bar'
  }
}
```

## Lifecycle Methods

### `init?(config: ViewModelInitConfig<this>): void`  
Optional hook called when the instance is connected to a [`ViewModelStore`](/api/view-model-store/interface) (for example via [`define`](/api/view-model-store/interface#define-config) / [`connect`](/api/view-model-store/base-implementation#connect-instance-config)). Also called by the React / Solid integrations when creating a VM without a store.

### `mount(): void | Promise<void>`  
Called when the component is mounted in the React / Solid tree.  

::: tip 
In [`ViewModelBase`](/api/view-models/base-implementation), prefer putting async work in [`willMount()`](/api/view-models/base-implementation#willmount-void) — it may return a `Promise`, and `mount()` waits for it before setting `isMounted` to `true`.
:::

#### Example: Async Mounting
```ts
import { ViewModelBase } from "mobx-view-model";

class JediProfileVM extends ViewModelBase<{ jediId: string }> {
  protected async willMount() {
    await this.loadJediData();
  }

  private async loadJediData() {
    const response = await fetch(`/api/jedi/${this.payload.jediId}`);
    this.jediData = await response.json();
  }
}
```

### `unmount(): void`  
Called when the component is unmounted from the React / Solid tree.  

::: tip 
[`ViewModelBase`](/api/view-models/base-implementation) sets `isMounted` to `false` during this method and aborts [`unmountSignal`](/api/view-models/base-implementation#unmountsignal).
:::

## Payload Management

### `setPayload(payload: Payload): boolean`  
Updates the view model's payload data.  

Returns `true` when the new payload is considered equal to the current one (no update applied), and `false` when the payload was updated.

::: warning React / Solid integration
React applies payload updates to an existing view model after the render commits. Initial `ViewModelSimple` binding and Solid setup may still call `setPayload` before [`mount()`](#mount-void-promise-void) finishes, when `isMounted` is `false`. Guard any work in `setPayload` that requires a mounted view model.
:::

::: tip
When extending [`ViewModelBase`](/api/view-models/base-implementation), do not assign to `this.payload` directly (it is a getter): call `super.setPayload(payload)` or customize comparison with [`comparePayload`](/api/view-models/view-models-config#comparepayload).
:::

#### Example: Payload Update with Validation
```ts
import { ViewModelBase } from "mobx-view-model";
import { runInAction } from "mobx";

class LightsaberVM extends ViewModelBase<{ jediId: string }> {
  @observable
  accessor currentJediId: string | null = null;

  setPayload(payload: { jediId: string }) {
    if (this.currentJediId !== payload.jediId) {
      runInAction(() => {
        this.currentJediId = payload.jediId;
      });
    }
    return super.setPayload(payload);
  }
}
```
