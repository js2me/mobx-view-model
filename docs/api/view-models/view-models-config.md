# `ViewModelsConfig` configuration object   
This configuration contains all options for the behavior of [`ViewModel`](/api/view-models/overview) instances.  

The package provides a **global object** with this configuration, but you can also change it for each [`ViewModel`](/api/view-models/overview) and [`ViewModelStore`](/api/view-model-store/overview) separately using the `vmConfig` field.

```ts
import { viewModelsConfig, ViewModelStoreBase } from "mobx-view-model";
import { withViewModel } from "mobx-view-model-react";

viewModelsConfig.comparePayload = false;

withViewModel(VM, View, {
  vmConfig: {
    comparePayload: false
  }
})

new ViewModelStoreBase({
  vmConfig: {
    comparePayload: false
  }
})
```

[Reference to source code](/src/config/types.ts)  

## Recommendations  

These are the recommended settings for the global configuration `viewModelsConfig`,
which contain the most optimal values.

```ts
import { viewModelsConfig } from 'mobx-view-model';

viewModelsConfig.comparePayload = false;
viewModelsConfig.payloadComputed = 'struct';
viewModelsConfig.payloadObservable = 'ref';

viewModelsConfig.observable.viewModels.useDecorators = true; //false
viewModelsConfig.observable.viewModelStores.useDecorators = true; // false
```

## `mode`  
Runtime mode for the library integration:

- `'csr-only'` — _**(default)**_ client-side only
- `'ssr'` — enable SSR-oriented behavior in the React / Solid integration

## `getPayload`  
Extracts the ViewModel payload from component props.  

Default: `(allProps) => allProps.payload ?? {}`.  

Used by [`withViewModel`](/react/api/with-view-model). Override globally or per HOC when you want a different payload shape (see also [`withPropsViewModel`](/react/api/with-props-view-model)).

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

- `'strict'` - structural equality ([`comparer.structural` from MobX](https://mobx.js.org/computeds.html#built-in-comparers))  
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
- `false` - no observable wrapping  

## `factory()`  
Factory function for creating [`ViewModel`](/api/view-models/interface) / [`ViewModelSimple`](/api/view-models/view-model-simple) instances.  

Can be helpful if you want to add some constructor arguments for your own [`ViewModel`](/api/view-models/interface) implementation  


::: tip Default implementation  
Creates `ViewModelSimple` with `new VM()`, and full `ViewModel` with `new VM({ ...config, vmConfig })`.  
See [global-config.ts](/src/config/global-config.ts).  
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

## <ReactMark /> `fallbackComponent`  
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

## <ReactMark /> `reactHook` {#reacthook}  
Optional default for the [`reactHook`](/react/api/with-view-model.html#reacthook) option on [`withViewModel`](/react/api/with-view-model): used when the HOC config does not set `reactHook` (resolved as `config.reactHook ?? viewModelsConfig.reactHook`).  

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
};
```

## `hooks`  
Internal event hooks for view model stores.

### `hooks.storeCreate`  
Called when a `ViewModelStore` instance is created.  
Useful for wiring external listeners or diagnostics.

## <ReactMark /> `processRender`  
A higher-order function that processes and transforms the view render function before it is wrapped by [`withViewModel`](/react/api/with-view-model) / Solid equivalent.   
This function enables component composition and modification at the ViewModel level, allowing for:
- Wrapping components with additional functionality (error boundaries, providers, etc.)
- Injecting props or context
- Modifying component behavior
- Adding global features like logging, analytics, or performance monitoring

#### Example  
```tsx
viewModelsConfig.processRender = (Component) => {
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

## `observable`  

This is a large configuration object for all base implementations in `mobx-view-model`, like `ViewModelBase` or `ViewModelStoreBase`.   
You can modify the default behavior of wrapping in [`makeObservable()` MobX functions](https://mobx.js.org/observable-state.html#makeobservable).   

Properties of the nested observable configs:  
### - `disableWrapping`  
This removes `makeObservable(this, annotations)`/`makeObservable(this)` calls  
### - `useDecorators`  
This changes the style of marking `MobX` annotations from "decorators style" to "non-decorators style".   
Very helpful if you want to write code with "non decorators style".   

::: tip This property has default value - `true` 
:::

Example:   
```ts
import { observable, action, makeObservable } from "mobx";
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

You should do this before the app starts.  

## Usage  

```ts
import { viewModelsConfig } from "mobx-view-model";

// Configure payload update/reactivity behavior
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
// viewModelsConfig.factory = (config) => new config.VM(rootStore, config);
// viewModelsConfig.fallbackComponent = () => <LoadingSpinner />;
// viewModelsConfig.onMount = (vm) => console.log('Mounted:', vm.id);
// viewModelsConfig.onUnmount = (vm) => console.log('Unmounted:', vm.id);
```

## <ReactMark /> Possible causes of infinite re-renders due to payload access  

The flexible configuration of the payload reactivity and update behavior can lead to infinite re-renders inside the View component.  
This happens when the payload is changing every time the component is re-rendered.  

The following ViewModel configurations can cause this problem:  

@{circularVmPayloadDependencyTestCases}
