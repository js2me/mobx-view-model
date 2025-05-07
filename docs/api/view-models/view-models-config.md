# `ViewModelsConfig` configuration object   
This object contains all global options for some behaviour of view models instances  


## `startViewTransitions`  
Indicates whether to enable transitions for the start view.  
[MDN Reference](https://developer.mozilla.org/docs/Web/API/View_Transitions_API)

::: warning  
This feature is experimental and not all browsers support it yet.  
:::

## `comparePayload`  
Allows you to configure how payload should be compared   

- `'strict'` - _**(default)**_ strict equality ([`comparer.structural` from MobX](https://mobx.js.org/computeds.html#built-in-comparers))  
- `'shallow'` - shallow equality  
- `false` - **(recommended)** no comparison  
- `fn` - custom payload compare fn (e.g. [MobX comparer functions](https://mobx.js.org/computeds.html#built-in-comparers))  

## `payloadComputed`  
Allows you to configure `computed` statement of the payload  
- `'struct'` - **(recommended)** [`computed.struct` from MobX](https://mobx.js.org/computeds.html#computed-struct)  
- `true` - [`computed` from MobX](https://mobx.js.org/computeds.html)  
- `fn` - [custom equality function](https://mobx.js.org/computeds.html#equals) for [`computed` from MobX](https://mobx.js.org/computeds.html)  
- `false` - _**(default)**_ do not wrap `payload` into `computed` MobX utility  

## `payloadObservable`  
Indicates type of observable for `ViewModel` payload.  

- `'ref'` - _**(default)**_ **(recommended)** [MobX ref observable](https://mobx.js.org/api.html#observableref)  
- `'deep'` - [MobX deep observable](https://mobx.js.org/api.html#observabledeep)  
- `'struct'` - [MobX struct observable](https://mobx.js.org/api.html#observablestruct)   
- `'shallow'` - [MobX shallow observable](https://mobx.js.org/api.html#observableshallow)  
- `false` - no observer  

## `generateId()`  
Generates an unique identifier for a [`ViewModel`](/api/view-models/interface).   

Default library implementation is [here](/src/utils/create-vm-id-generator.ts#L16)  

#### Example 


```ts
import { viewModelsConfig } from "mobx-view-model";

viewModelsConfig.generateId = () => crypto.randomUUID();
```

## `factory()`  
Factory function for creating [`ViewModel`](/api/view-models/interface) instances.  

Can be helpful if you want to add some constructor arguments for your own [`ViewModel`](/api/view-models/interface) implementation  

#### Example  

```ts
import { viewModelsConfig } from "mobx-view-model";

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

## `wrapViewsInObserver`  

Wrap View components into [`observer()` MobX HOC](https://mobx.js.org/api.html#observer)  

::: tip
It works only for [`withViewModel` HOCs](/react/api/with-view-model)  
:::

## `observable`  

This is huge configuration object for all base implementations `mobx-view-model` entities like `ViewModelBase` or `ViewModelStoreBase`.   
You can modify default behaviour of the wrapping into [`makeObservable()` MobX functions](https://mobx.js.org/observable-state.html#makeobservable).   

Properties of the nested observable configs:  
### - `disableWrapping`  
This is removes `makeObservable(this, annotations)`/`makeObservable(this)` calls  
### - `useDecorators`  
This is change style of marking `MobX` annotations from "decorators style" to "non decorators style".   
Very helpful if you want to write code with "non decorators style".   

**default value is `true`**  

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
