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
Declares the parent `ViewModel` type where current `ViewModel` is rendered in the component hierarchy.  
Enables access to parent view model through the `parentViewModel` property.  
Optional, defaults to `null` if not specified.

## Core Properties  

### `id: string`  
Unique identifier for the view model instance.  
Used for tracking and managing view model lifecycle.

### `vmConfig: ViewModelConfig`  
Configuration object for the view model.  
See [ViewModelsConfig](/api/view-models/view-models-config) for detailed configuration options.

### `payload: Payload`  
Data object passed from the parent component to the view model.  

### `isMounted: boolean`  
Indicates whether the `ViewModel` is currently mounted with its associated component.  
Controls the rendering of the connected view component:
- `true`: Component is rendered
- `false`: Component is not rendered

### `isUnmounting: boolean`  
Indicates whether the `ViewModel` is in the process of unmounting.  
Used for cleanup and transition states during component unmounting.

### `parentViewModel: ParentViewModel | null`   
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

### `mount(): void | Promise<void>`  
Called when the component is mounted in the React tree.  

::: tip 
The behavior depends on your [ViewModelStore](/api/view-model-store/interface) implementation.  
Base implementation sets `isMounted` to `true` after this method.
:::

:::tip
Can return a Promise for asynchronous mounting operations.
:::

#### Example: Async Mounting
```ts
import { ViewModelBase } from "mobx-view-model";

class JediProfileVM extends ViewModelBase<{ jediId: string }> {
  async mount() {
    await this.loadJediData();
    await super.mount();
  }

  private async loadJediData() {
    const response = await fetch(`/api/jedi/${this.payload.jediId}`);
    this.jediData = await response.json();
  }
}
```

### `unmount(): void | Promise<void>`  
Called when the component is unmounted from the React tree.  

::: tip 
Behavior depends on your ViewModelStore implementation.  
Base implementation sets `isMounted` to `false` after this method.
:::

:::tip
Can return a Promise for asynchronous cleanup operations.
:::

## Payload Management

### `setPayload(payload: Payload): void`  
Updates the view model's payload data.  

::: tip
In custom implementations, ensure to update `this.payload` in this method.
:::

#### Example: Payload Update with Validation
```ts
import { ViewModelBase } from "mobx-view-model";

class LightsaberVM extends ViewModelBase<{ jediId: string }> {
  @observable
  accessor currentJediId: string | null = null;

  setPayload(payload: { jediId: string }) {
    if (this.currentJediId !== payload.jediId) {
      this.currentJediId = payload.jediId;
      this.payload = payload;
      this.payloadChanged();
    }
  }
}
```

### `payloadChanged(payload: Payload, prevPayload: Payload): void`  
Called when the payload is updated via [`setPayload()`](/api/view-models/interface#setpayload-payload-payload-void).  
Use this method to handle payload changes and trigger necessary updates.

#### Example: Handling Payload Changes
```ts
import { ViewModelBase } from "mobx-view-model";
import { runInAction } from "mobx";

class DeathStarVM extends ViewModelBase<{ targetId: string }> {
  @observable
  accessor currentTargetId: string | null = null;

  payloadChanged(payload, prevPayload) {
    if (this.currentTargetId !== payload.targetId) {
      runInAction(() => {
        this.currentTargetId = payload.targetId;
        this.initializeWeapon();
      });
    }
  }

  private async initializeWeapon() {
    const response = await fetch(`/api/weapons/${this.currentTargetId}`);
    this.weaponData = await response.json();
  }
}
```