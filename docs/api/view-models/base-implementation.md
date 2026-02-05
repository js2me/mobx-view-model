---
id: view-model-base-implementation
title: View Model base implementation
sidebar_label: Base Implementation
sidebar_position: 3
slug: /api/view-models/base-implementation
---

# `ViewModelBase` class  

This is base implementation of the [`ViewModel`](/api/view-models/interface) interface  

[Reference to source code](/src/view-model/view-model.base.ts)  


## Methods and properties  
Here is documentation about **base implementation** methods and properties.  

::: info 
If you want to read about [`ViewModel`](/api/view-models/interface) interface methods and properties [go to interface documentation](/api/view-models/interface)  
:::

### `viewModels`  
Reference to instance of [`ViewModelStore`](/api/view-model-store/overview).  
Allows to get access to other [`ViewModels`](/api/view-models/interface).  

#### Example   

```ts
import { ViewModelBase } from "mobx-view-model";

export class SithCardVM extends ViewModelBase {
  get power() {
    return this.viewModels.get(JediCardVM)?.power ?? 0;
  }
}

export class StarWarsBattlefieldVM extends ViewModelBase {
  get jedisCount() {
    this.viewModels.getAll(JediCardVM).length;
  }

  get sithsCount() {
    this.viewModels.getAll(SithCardVM).length;
  }
}
```


### `unmountSignal`   
This is [`AbortSignal`](https://developer.mozilla.org/ru/docs/Web/API/AbortSignal) which is signaled when your [`ViewModel`](/api/view-models/interface) is unmounted. It happens after `unmount()` completes in the base implementation.   

#### Example   
```ts
import { ViewModelBase } from "mobx-view-model";
import { autorun } from "mobx"

export class TestVM extends ViewModelBase {
  protected willMount() {
    autorun(
      () => {
        console.log("log", this.id, this.isMounted);
      },
      {
        signal: this.unmountSignal
      }
    );
  }
}
```

### `vmConfig`  
Configuration object for the view model.  
See [ViewModelsConfig](/api/view-models/view-models-config) for detailed configuration options.

### `isMounted: boolean` <Badge type="tip" text="computed" />  
Indicates whether the `ViewModel` is currently mounted with its associated component.  

### `isUnmounting: boolean` <Badge type="tip" text="computed" />  
Indicates whether the `ViewModel` is in the process of unmounting.  

### `willMount(): void` <Badge type="info" text="protected" />  
Called when the component begins mounting in the React tree.  
Executes before the `mount()` method.

### `mount(): void | Promise<void>` <Badge type="info" text="action.bound" />  
Called when the component is mounted in the React tree.  

This method sets [`isMounted`](/api/view-models/interface#ismounted-boolean) to `true`.   
If you are overriding this method be sure that you called the [`super.mount()`](/api/view-models/interface#mount-void-promise-void), 
otherwise your view component connected to this `ViewModel` will never be rendered
because inside [`withViewModel`](/react/api/with-view-model) HOC libary comparing the [`isMounted`](/api/view-models/interface#ismounted-boolean) flag with `true` before render the view component  

This method can be async. This feature is helpful if you want to load some data or do something before the view component will be rendered  

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


### `didMount(): void` <Badge type="info" text="protected" />  
Called after the view model is fully mounted and ready for use.  
Ideal for post-mount initialization and side effects.

#### Example: Post-Mount Actions
```ts
import { ViewModelBase } from "mobx-view-model";

class ForceAlertVM extends ViewModelBase<{ message: string }> {
  protected didMount() {
    this.rootStore.notifications.push({
      type: 'success',
      title: "May the Force be with you!",
      message: this.payload.message
    });
  }
}
```

### `willUnmount(): void` <Badge type="info" text="protected" />  
Called when the component begins unmounting from the React tree.  
Executes before the `unmount()` method.

### `unmount(): void | Promise<void>` <Badge type="info" text="action.bound" />    
Called when the component is unmounted from the React tree.  

This method sets [`isMounted`](/api/view-models/interface#ismounted-boolean) to `false`.   
If you are overriding this method be sure that you called the [`super.unmount()`](/api/view-models/interface#mount-void-promise-void), 
otherwise your view component connected to this `ViewModel` will never be unmounted  

### `didUnmount(): void` <Badge type="info" text="protected" />    
Called after the view model is fully unmounted.  
Ideal for final cleanup operations.

### [`setPayload(payload: Payload): void`](/api/view-models/interface#setpayload-payload-payload-void)  

Updates the view model's payload data.

Base implementation of this method `strict` comparing current payload and new payload before sets the new  
This can be overriden using [view models configuration](/api/view-models/view-models-config) or overriding the protected [`isPayloadEqual`](#ispayloadequal-current-payload-next-payload-boolean) method    

#### `isPayloadEqual?.(current: Payload, next: Payload): boolean` <Badge type="danger" text="protected" />   
This method is needed for comparing current payload and next payload.   

You can customize payload comparison overriding this method or configure [`viewModelsConfig`](/api/view-models/view-models-config)  

Example:  
```ts
class PostcardBox extends ViewModelBase {
  isPayloadEqual() {
    return true;
  }
}
```

## Additional utility types  

[Reference to source code](/src/view-model/view-model.base.types.ts)  

### `InferViewModelParams<T>`  
Utility type that infers constructor params for a `ViewModelBase` subclass.  
It resolves to `ViewModelParams<Payload, ParentViewModel, ComponentProps>` based on the class generics.  

#### Example  
```ts
import {
  ViewModelBase,
  InferViewModelParams,
} from "mobx-view-model";

class UserVM extends ViewModelBase<
  { userId: string },
  null,
  { isAdmin?: boolean }
> {
  constructor(params: InferViewModelParams<UserVM>) {
    params.vmConfig = {
      ...params.vmConfig,
      comparePayload: 'strict',
    };

    super(params);
  }
}
```
