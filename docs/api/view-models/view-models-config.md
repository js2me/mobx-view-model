# `ViewModelsConfig` configuration object   
This configration contains all options for some behaviour of [`ViewModel`](/api/view-models/overview) instances.  

The package provides a **global object** with this configuration, but you can also change it for each [`ViewModel`](/api/view-models/overview) and [`ViewModelStore`](/api/view-model-store/overview) separately using the `vmConfig` field.

```ts
import {
  viewModelsConfig,
  withViewModel,
  ViewModelStoreBase
} from "mobx-view-model";

viewModelsConfig.comparePayload = false;

import { withViewModel } from "mobx-view-model";

viewViewModel(VM, {
  vmConfig: {
    comparePayload: false
  }
})()

new ViewModelStoreBase({
  vmConfig: {
    comparePayload: false
  }
})
```

[Reference to source code](/src/config/global-config.ts#L9)  

## Recommendations  

These are the recommended settings for the global configuration `viewModelsConfig`,
which contain the most optimal values.

```ts
import { loadableDefaultConfig } from '@one-web/uikit-7';
import { viewModelsConfig, ViewModelStoreBase } from 'mobx-view-model';

viewModelsConfig.comparePayload = false;
viewModelsConfig.payloadComputed = 'struct';
viewModelsConfig.payloadObservable = 'ref';

viewModelsConfig.observable.viewModels.useDecorators = true; //false
viewModelsConfig.observable.viewModelStores.useDecorators = true; // false
```

## `startViewTransitions`  
Controls view transitions for view model lifecycle moments.  
[MDN Reference](https://developer.mozilla.org/docs/Web/API/View_Transitions_API)

#### Shape  
`startViewTransitions` is an object with these flags:
- `mount` - start transition when the view mounts
- `payloadChange` - start transition when the payload changes
- `unmount` - start transition when the view unmounts

In `ViewModelsRawConfig` you can also pass a boolean to toggle all flags at once.

::: warning  
This feature is experimental and not all browsers support it yet.  
:::

## `comparePayload`  
Allows you to configure how payload should be compared   

- `'strict'` - strict equality ([`comparer.structural` from MobX](https://mobx.js.org/computeds.html#built-in-comparers))  
- `'shallow'` - shallow equality  
- `false` - _**(default)**_, **(recommended)** no comparison  
- `fn` - custom payload compare fn (e.g. [MobX comparer functions](https://mobx.js.org/computeds.html#built-in-comparers))  

## `payloadComputed`  
Allows you to configure `computed` statement of the payload  
- `'struct'` -  _**(default)**_, **(recommended)** [`computed.struct` from MobX](https://mobx.js.org/computeds.html#computed-struct)  
- `true` - [`computed` from MobX](https://mobx.js.org/computeds.html)  
- `fn` - [custom equality function](https://mobx.js.org/computeds.html#equals) for [`computed` from MobX](https://mobx.js.org/computeds.html)  
- `false` - do not wrap `payload` into `computed` MobX utility  

## `payloadObservable`  
Indicates type of observable for `ViewModel` payload.  

- `'ref'` - _**(default)**_ **(recommended)** [MobX ref observable](https://mobx.js.org/api.html#observableref)  
- `'deep'` - [MobX deep observable](https://mobx.js.org/api.html#observabledeep)  
- `'struct'` - [MobX struct observable](https://mobx.js.org/api.html#observablestruct)   
- `'shallow'` - [MobX shallow observable](https://mobx.js.org/api.html#observableshallow)  
- `false` - no observer  

## `generateId()`  
Generates an unique identifier for a [`ViewModel`](/api/view-models/interface).   

::: tip This property has default implementation [here](/src/utils/generate-vm-id.ts#L16)
:::

#### Example 

_Using `crypto.randomUUID()` to generate view model ids_
```ts{3}
import { viewModelsConfig } from "mobx-view-model";

viewModelsConfig.generateId = () => crypto.randomUUID();
```

## `factory()`  
Factory function for creating [`ViewModel`](/api/view-models/interface) instances.  

Can be helpful if you want to add some constructor arguments for your own [`ViewModel`](/api/view-models/interface) implementation  


::: tip This property has default implementation [here](/src/config/global-config.ts#L25) 
:::

#### Example  

_Passing `RootStore` as first constructor parameter_
```ts{2,6}
import { viewModelsConfig } from "mobx-view-model";
import { rootStore } from "@/shared/store";

viewModelsConfig.factory = (config) => {
  const { VM } = config;
  return new VM(rootStore, config);
}
```

## `fallbackComponent`  
A component that will be rendered while the view model is in a loading or processing state.  
This is useful for showing loading spinners, skeletons, or placeholder content.

#### Example
```tsx
viewModelsConfig.fallbackComponent = () => (
  <div className="loading-spinner">
    Loading...
  </div>
);
```

## `onMount`  
A lifecycle hook that is called when a view model is mounted.  
Useful for tracking component mounting, initializing external services, or setting up subscriptions.

#### Example
```tsx
viewModelsConfig.onMount = (viewModel) => {
  console.log(`ViewModel ${viewModel.id} mounted`);
  // Setup analytics tracking
  analytics.track('component_mounted', { id: viewModel.id });
};
```

## `onUnmount`  
A lifecycle hook that is called when a view model is unmounted.  
Useful for cleanup operations, removing subscriptions, or tracking component lifecycle.

#### Example
```tsx
viewModelsConfig.onUnmount = (viewModel) => {
  console.log(`ViewModel ${viewModel.id} unmounted`);
  // Cleanup subscriptions
  viewModel.dispose();
};
```

## `hooks`  
Internal event hooks for view model stores.

### `hooks.storeCreate`  
Called when a `ViewModelStore` instance is created.  
Useful for wiring external listeners or diagnostics.

## `processViewComponent`  
A higher-order function that processes and transforms the view component before it is rendered.   
This function enables component composition and modification at the ViewModel level, allowing for:
- Wrapping components with additional functionality (error boundaries, providers, etc.)
- Injecting props or context
- Modifying component behavior
- Adding global features like logging, analytics, or performance monitoring

#### Example  
```tsx
viewModelsConfig.processViewComponent = (Component) => {
  return (props) => {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
```
::: warning It works only for [`withViewModel` HOCs](/react/api/with-view-model)  
:::

## `wrapViewsInObserver`  

Wrap View components in [`observer()` MobX HOC](https://mobx.js.org/api.html#observer)  
This property is enabled by default.   


You can turn off this behaviour by setting `wrapViewsInObserver` to `false`.   
Example:    
```tsx
import { viewModelsConfig } from "mobx-view-model";

viewModelsConfig.wrapViewsInObserver = false;
```

::: warning It works only for [`withViewModel` HOCs](/react/api/with-view-model)  
:::

## `observable`  

This is huge configuration object for all base implementations `mobx-view-model` entities like `ViewModelBase` or `ViewModelStoreBase`.   
You can modify default behaviour of the wrapping in [`makeObservable()` MobX functions](https://mobx.js.org/observable-state.html#makeobservable).   

Properties of the nested observable configs:  
### - `disableWrapping`  
This is removes `makeObservable(this, annotations)`/`makeObservable(this)` calls  
### - `useDecorators`  
This is change style of marking `MobX` annotations from "decorators style" to "non decorators style".   
Very helpful if you want to write code with "non decorators style".   

::: tip This property has default value - `true` 
:::

Example:   
```ts
import { observable, action } from "mobx";
import {
  viewModelsConfig,
  ViewModelBase,
  ViewModelParams
} from "mobx-view-model";

viewModelsConfig.observable.viewModels.useDecorators = false;

class YourViewModel extends ViewModelBase  {
  constructor(params: ViewModelParams) {
    super(params);

    makeObservable(this, {
      fruitName: observable,
      setFruitName: action.bound,
    })
  }

  fruitName: string = '';

  setFruitName(fruitName: string) {
    this.fruitName = fruitName;
  }
}
```

Another example with "decorators style":  
```ts
import { observable, action } from "mobx";
import {
  viewModelsConfig,
  ViewModelBase,
  ViewModelParams
} from "mobx-view-model";

viewModelsConfig.observable.viewModels.useDecorators = true;

class YourViewModel extends ViewModelBase  {
  @observable
  fruitName: string = '';

  @action.bound
  setFruitName(fruitName: string) {
    this.fruitName = fruitName;
  }
}
```

### - `custom(context, annotationsArray)`  
Custom function for wrapping your entity   


## global configuration object   
You can override default global config using import `viewModelsConfig`.  

```ts
import { viewModelsConfig } from "mobx-view-model";
```

You should do this before start whole app  

## Usage  

```ts
import { viewModelsConfig } from "mobx-view-model";

// Configure payload update\reactivity behaviour
viewModelsConfig.payloadObservable = 'ref';
viewModelsConfig.comparePayload = false;
viewModelsConfig.payloadComputed = 'struct';


// Disable view transitions
viewModelsConfig.startViewTransitions = {
  mount: false,
  payloadChange: false,
  unmount: false,
};

// Optional configurations (uncomment to use)
// viewModelsConfig.generateId = () => crypto.randomUUID();
// viewModelsConfig.factory = (config) => new config.VM(rootStore, config);
// viewModelsConfig.fallbackComponent = () => <LoadingSpinner />;
// viewModelsConfig.onMount = (vm) => console.log('Mounted:', vm.id);
// viewModelsConfig.onUnmount = (vm) => console.log('Unmounted:', vm.id);
```

## Possible causes of infinite rerenders due to payload access  

The flexible configuration of the payload reactivity and update behavior can lead to infinite rerenders inside the View component.  
This happens when the payload is changing every time the component is rerendered.  

The following ViewModel configurations can cause this problem:  

{circularVmPayloadDependencyTestCases}
