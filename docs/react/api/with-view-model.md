# `withViewModel` HOC  

A Higher-Order Component that connects React components to their [ViewModels](/api/view-models/overview), providing seamless MobX integration.  

## API Signature
```tsx
function withViewModel<VM extends AnyViewModel>(
  ViewModelClass: Class<VM>,
  config?: ViewModelHocConfig<VM>
):
  (Component: ComponentType<ComponentProps & ViewModelProps<VM>>) =>
    ComponentWithViewModel

function withViewModel<
  TViewModel extends AnyViewModel,
  TCompProps extends AnyObject = ViewModelProps<TViewModel>,
>(
  model: Class<TViewModel>,
  component: ComponentType<TCompProps & ViewModelProps<TViewModel>>,
  config?: ViewModelHocConfig<TViewModel>,
): ComponentWithViewModel<TViewModel, TCompProps>;
```

##  Usage  

### 1. Basic Usage (Default Configuration)  

```tsx
export const YourComponent = withViewModel(VMClass)(ViewComponent);

export const YourComponent = withViewModel(VMClass, ViewComponent);
```

### 2. Custom Configuration   
```tsx
export const YourComponent = withViewModel(VMClass, {
  vmConfig: {}, // vmConfig
  ctx: {}, // internal object as source for all cache inside this HOC
  factory: (config) => new config.VM(config), // factory method for creating VM instances
  fallback: () => <div>loading</div>, // fallback component for cases when your VM is mounting\loading
  generateId, // custom fn for generate id for this VM instances
  getPayload: (props) => props.payload, // function to getting payload data from props
  id, // unique id if you need to create 1 instance of your VM
  reactHook: (allProps, ctx, viewModels) => void 0, // hook for integration inside render HOC component  
})(ViewComponent)

export const YourComponent = withViewModel(VMClass, ViewComponent, {
  vmConfig: {}, // vmConfig
  ctx: {}, // internal object as source for all cache inside this HOC
  factory: (config) => new config.VM(config), // factory method for creating VM instances
  fallback: () => <div>loading</div>, // fallback component for cases when your VM is mounting\loading
  generateId, // custom fn for generate id for this VM instances
  getPayload: (props) => props.payload, // function to getting payload data from props
  id, // unique id if you need to create 1 instance of your VM
  reactHook: (allProps, ctx, viewModels) => void 0, // hook for integration inside render HOC component  
})
```

### Examples:  

```tsx
import {
  ViewModelBase,
  ViewModelProps,
  withViewModel
} from "mobx-view-model";
import { observer } from "mobx-react-lite";
import { observable, action } from "mobx";

class VM extends ViewModelBase {
  @observable
  accessor value = '';

  @action
  setValue = (value: string) => {
    this.value = value;
  }
}

const ComponentView = observer(({ model }: ViewModelProps<VM>) => {
  return (
    <div>
      <input
        value={model.value}
        onChange={e => model.setValue(e.target.value)}
      />
    </div>
  )
})

export const YourComponent = withViewModel(VM)(ComponentView);


export const AnotherComponent = withViewModel(VM, ({ model }) => {

  return (
    <div>
      <input
        className={"bg-[red]"}
        value={model.value}
        onChange={e => model.setValue(e.target.value)}
      />
    </div>
  )
})
```

## Incompatibility with `<Suspense />` and `lazy()`   

The `withViewModel` HOC is not compatible with the React's built-in [`<Suspense />`](https://react.dev/reference/react/Suspense) component and [`lazy()`](https://react.dev/reference/react/lazy) function.  

Using `Suspense` and `lazy` with `withViewModel` HOC can lead to unexpected behavior and bugs due to double/triple calls of `useMemo` or lazy `useState` hooks inside [`useCreateViewModel`](/react/api/use-create-view-model) hook.

To avoid this issue, it is recommended to use [`withLazyViewModel`](/react/api/with-lazy-view-model) HOC instead.

