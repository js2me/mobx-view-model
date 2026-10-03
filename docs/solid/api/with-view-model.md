# `withViewModel` HOC

A Higher-Order Component that connects Solid components to their [ViewModels](/api/view-models/overview).

::: info No `observer` needed  
MobX reactivity comes from [mobx-solid](https://js2me.github.io/mobx-solid/) (`enableObservableTracking`). Read observables directly in JSX.  
:::

## API Signature

```tsx
function withViewModel<TViewModel extends AnyViewModel>(
  VM: Class<TViewModel>,
  renderFn: (props: OriginProps & ViewModelProps<TViewModel>) => JSX.Element,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, OriginProps>;
```

## Configuration

### `getPayload`

Sets the `payload` for the ViewModel attached to the view.

Default: `(props) => props.payload`

Example — all props as payload:

```tsx
class VM extends ViewModelBase {
  get foo() {
    return this.payload.foo;
  }
}

export const YourComponent = withViewModel(
  VM,
  () => <div>1</div>,
  { getPayload: (props) => props },
);

<YourComponent foo={"1"} />
```

Prefer [`withPropsViewModel`](/solid/api/with-props-view-model) for this pattern.

### `factory`

Factory for creating ViewModel instances.  
[Same as `factory` in `viewModelsConfig`](/api/view-models/view-models-config.html#factory)

### `id`

Unique identifier for the view.

### `solidHook`

Extra Solid reactive setup inside the resulting component (runs during component setup).

```tsx
import { withViewModel, type WithViewModelSolidHook } from "mobx-view-model-solid";

const useExtraSetup: WithViewModelSolidHook = (props) => {
  // Solid createEffect / createMemo / etc.
};

const Component = withViewModel(YourVM, () => <div>1</div>, {
  solidHook: useExtraSetup,
});
```

Falls back to `viewModelsConfig.reactHook` if `solidHook` is omitted (shared callback shape).

### `fallback`

Component to render while the view model is mounting.

```tsx
class YourVM extends ViewModelBase {
  async mount() {
    await fetchData();
    super.mount();
  }
}

const Component = withViewModel(YourVM, () => <div>1</div>, {
  fallback: () => <div>loading...</div>,
});
```

### `vmConfig`

Additional ViewModel configuration.  
[See `viewModelsConfig`](/api/view-models/view-models-config)

### `ctx`

Static unique data for this HOC call.

### `anchors`

Additional Solid component anchors for the same VM instance.  
`useViewModel(AnchorComponent)` returns this VM when the connected component is mounted.

```tsx
const Anchor = () => null;
const Component = withViewModel(VM, View, {
  anchors: [Anchor],
});
// useViewModel(Anchor) → same VM as View receives
```

### `connect(anchor)`

Registers additional anchors dynamically.

```tsx
const Anchor = () => null;
const Component = withViewModel(VM, View).connect(Anchor);

const model = useViewModel(Anchor);
```

## Usage

### Basic

```tsx
import { ViewModelBase } from "mobx-view-model";
import { ViewModelProps, withViewModel } from "mobx-view-model-solid";
import { observable, action } from "mobx";

class VM extends ViewModelBase {
  @observable
  accessor value = "";

  @action
  setValue = (value: string) => {
    this.value = value;
  };
}

export const YourComponent = withViewModel(VM, (props: ViewModelProps<VM>) => (
  <div>
    <input
      value={props.model.value}
      onInput={(e) => props.model.setValue(e.currentTarget.value)}
    />
  </div>
));
```

### Custom configuration

```tsx
export const YourComponent = withViewModel(VMClass, ViewComponent, {
  vmConfig: {},
  ctx: {},
  factory: (config) => new config.VM(config),
  fallback: () => <div>loading</div>,
  getPayload: (props) => props.payload,
  id: "unique-id",
  anchors: [],
  solidHook: (allProps, ctx, viewModels) => {},
});
```

## Notes

- Solid component functions run once; keep MobX reads in JSX / Solid computations.
- Prefer not destructuring Solid `props` if you need them to stay reactive for `getPayload` updates — the HOC passes an accessor `() => getPayload(allProps)` into [`useCreateViewModel`](/solid/api/use-create-view-model).
