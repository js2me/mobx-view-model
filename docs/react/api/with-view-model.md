# `withViewModel` HOC  

<ReactImportDeprecationWarning />

A Higher-Order Component that connects React components to their [ViewModels](/api/view-models/overview), providing seamless MobX integration.  


::: info This HOC wraps your view component into `observer()` HOC!
The render function is always wrapped with [`observer()`](https://mobx.js.org/api.html#observer) from `mobx-react-lite`.
:::

## API Signature
```tsx
function withViewModel<
  TViewModel extends AnyViewModel,
  TCompProps extends AnyObject = AnyObject,
>(
  model: Class<TViewModel>,
  component: ComponentType<TCompProps & ViewModelProps<TViewModel>>,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, TCompProps>;
```

## Configuration  

### `getPayload`   
This parameter sets the `payload` for `ViewModel` attached to view.  

Default: resolved from [`viewModelsConfig.getPayload`](/api/view-models/view-models-config#getpayload) (`(props) => props.payload ?? {}`).  

Example:   
_Using all props as "payload" for `ViewModel`_   
```tsx
class VM extends ViewModelBase {
  @computed
  get foo() {
    return this.payload.foo;
  }
}

export const YourComponent = withViewModel(VM, () =>{
  return <div>1</div>
}, {
  getPayload: (props) => props
});

<YourComponent foo={'1'} />
```

Prefer [`withPropsViewModel`](/react/api/with-props-view-model) for this pattern.

### `forwardRef`   
This parameter wraps the React component with the `React.forwardRef` HOC.  
It might be helpful if you need to forward a ref to your `View` component.   

Using this parameter requires `ViewModelProps<YourVM, RefType>` (second generic type `RefType`) to add the `ref` prop type.   

Default: `false`

::: info Better to use custom prop
This parameter uses `React.forwardRef`, so this is not a good solution for performance.  
Instead of this parameter you can use a custom prop like `targetInputRef`.
:::

Examples:   

```tsx{3,8}
class YourVM extends ViewModelBase {}

const Component = withViewModel(YourVM, ({ ref }) => {
  // ref: React.ForwardedRef<any>!
  return (
    <div ref={ref}>hello</div>
  )
}, { forwardRef: true })
```

_Case with an explicit `ref` type_  

```tsx{5}
class YourVM extends ViewModelBase {}

const Component = withViewModel(
  YourVM,
  ({ ref }: ViewModelProps<YourVM, HTMLDivElement>) => {
    // ref: React.ForwardedRef<HTMLDivElement>!
    return (
      <div ref={ref}>hello</div>
    )
  },
  { forwardRef: true }
)
```

### `factory`  

This is a factory function for creating ViewModel instances.  
[Same as factory function in `viewModelsConfig`](/api/view-models/view-models-config.html#factory)  

### `id`  
Unique identifier for the view.   
If omitted, React [`useId()`](https://react.dev/reference/react/useId) is used (stable across SSR hydration for the same tree).

### `reactHook`  
Function to invoke additional React hooks in the resulting component.   

:::info This React hook calls before everything what happens inside `withViewModel` HOC.
This can be helpful for preprocessing input data.
:::

Example:   
```tsx
import { ViewModelBase } from "mobx-view-model";
import { withViewModel, type WithViewModelReactHook } from "mobx-view-model-react";

const useSuperReactHook: WithViewModelReactHook = (props) => {
  props.foo = 1;
}

class YourVM extends ViewModelBase {}

const Component = withViewModel(YourVM, () => {
  return <div>1</div>
}, {
  reactHook: useSuperReactHook,
})
```

### `fallback`   
Component to render if the view model is not ready to render yet (for example while async [`willMount()`](/api/view-models/base-implementation#willmount-void) / `mount()` is in progress).   

Example:   
```tsx{5,12,13,14}
class YourVM extends ViewModelBase {
  protected async willMount() {
    await sleep(1000);
    await fetchData();
  }
}

const Component = withViewModel(YourVM, () => {
  return <div>1</div>
}, {
  fallback: () => {
    return <div>loading...</div>
  }
})
```

### `vmConfig`  
Additional configuration for the `ViewModel`.   
[See `viewModelsConfig` for details](/api/view-models/view-models-config)  

### `ctx`  
Object that contains static, unique data for this HOC call.   

### `anchors`  
Additional React component anchors for the same VM instance.  
When you pass anchor components here, `useViewModel(AnchorComponent)` will return this VM when the connected component is mounted.  
Useful when multiple components need to access the same ViewModel instance.

Anchors are stored in config and passed to the store's [`link()`](/api/view-model-store/interface#link) when the instance is connected via [`define`](/api/view-model-store/interface#define).

Example:
```tsx
const Anchor = () => null;
const Component = withViewModel(VM, View, {
  anchors: [Anchor],
});
// useViewModel(Anchor) returns the same VM as View receives
```

### `connect(anchor)`  
Registers additional anchors dynamically.  
Each anchor is added to `config.anchors`; `useViewModel(anchor)` will return this VM when the connected component is mounted.  
Use `connect()` when the anchor is defined elsewhere.

Example:
```tsx
const Anchor = () => null;
const Component = withViewModel(VM, View, { id: 'page' }).connect(Anchor);

// In another component:
const model = useViewModel(Anchor); // returns the same VM as View receives
```

##  Usage  

### 1. Basic Usage (Default Configuration)  

```tsx
export const YourComponent = withViewModel(VMClass, ViewComponent);
```

### 2. Custom Configuration   
```tsx
export const YourComponent = withViewModel(VMClass, ViewComponent, {
  vmConfig: {}, // vmConfig
  ctx: {}, // internal object used as cache key source inside this HOC
  factory: (config) => new config.VM(config), // factory method for creating VM instances
  fallback: () => <div>loading</div>, // fallback while your VM is mounting/loading
  getPayload: (props) => props.payload, // function to get payload data from props
  id, // unique id if you need to create 1 instance of your VM
  anchors: [], // additional components for useViewModel lookup
  reactHook: (allProps, ctx, viewModels) => void 0, // hook for integration inside render HOC component  
})
```

#### Examples:  

```tsx
import { ViewModelBase } from "mobx-view-model";
import { ViewModelProps, withViewModel } from "mobx-view-model-react";
import { observable, action } from "mobx";

class VM extends ViewModelBase {
  @observable
  accessor value = '';

  @action
  setValue = (value: string) => {
    this.value = value;
  }
}

export const YourComponent = withViewModel(VM, ({ model }: ViewModelProps<VM>) => {
  return (
    <div>
      <input
        value={model.value}
        onChange={e => model.setValue(e.target.value)}
      />
    </div>
  )
});


export const AnotherComponent = withViewModel(VM, ({ model }) => {
  return (
    <div>
      <input
        className="bg-[red]"
        value={model.value}
        onChange={e => model.setValue(e.target.value)}
      />
    </div>
  )
})
```

## Incompatibility with `<Suspense />` and `lazy()`   

The `withViewModel` HOC is not compatible with React’s built-in [`lazy()`](https://react.dev/reference/react/lazy) in the usual “lazy-wrap the VM component” setup.

Using `lazy` with `withViewModel` can lead to unexpected remount / id behavior. Prefer `loadable()` from `react-simple-loadable` (or similar) and register the wrapper via [`connect()`](#connectanchor).

When [`viewModelsConfig.mode`](/api/view-models/view-models-config#mode) is `'ssr'`, async `mount()` / `willMount()` is waited via React [`use()`](https://react.dev/reference/react/use) during SSR / hydration — put a [`Suspense`](https://react.dev/reference/react/Suspense) boundary (or `fallback`) around those trees if you need a loading UI.

### Concurrent Mode

In concurrent mode, React may discard a render without committing it, which means cleanup effects never run. Since `mount()` is called synchronously during render (required for SSR), an orphaned mount could occur if the render is discarded.

This mainly affects the scenario **without `ViewModelStore`**. With a store, instances are registered via [`define`](/api/view-model-store/interface#define) and cleaned up with [`unmountNew`](/api/view-model-store/interface#unmountnewinstance) in an effect.

**Recommendation:** Use `ViewModelStore` for full concurrent mode safety. The no-store scenario is designed for simple client-side use cases where SSR is not needed.


## Generic types for your wrapped `ViewModel` in this HOC   

When using this HOC you can run into a limitation: you cannot pass generic types for your `ViewModel`. For example:   

```tsx{3,9}
type JediType = 'defender'  | 'guard' | 'consul'

export class JediVM<TJediType extends JediType> extends ViewModelBase<{ jedi: TJediType }> {
  get jediType() {
    return this.payload.jedi;
  }
}

const Jedi = withViewModel<JediVM<JediType>>(JediVM, ({ model }) => {
  return (
    <div>
      {model.jediType}
    </div>
  )
})

<Jedi payload={{ jedi: 'defender' }} />
// Anyway `TJediType` will be `JediType`, but should be 'defender'
```

To enable generic types you need to cast the output `Jedi` component to a specific type:   

```tsx{1,7-9}
const Jedi = withViewModel(JediVM<JediType>, ({ model }) => {
  return (
    <div>
      {model.jediType}
    </div>
  )
}) as unknown as <TJediType extends JediType>(
  props: VMComponentProps<JediVM<TJediType>>,
) => React.ReactNode
```

This can be helpful if you need to customize the `payload` of your `ViewModel` based on generic types.  
