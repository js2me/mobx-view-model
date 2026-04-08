# `withViewModel`

Higher-order helper that connects a Vue component to a [ViewModel](/api/view-models/overview) and wires lifecycle, payload, and optional store integration.

## Observer wrapper

When [`wrapViewsInObserver`](/api/view-models/view-models-config#wrapviewsinobserver) is enabled (default), the **inner** view component is wrapped with [`observer()`](/vue/api/observer) from `mobx-view-model/vue` so MobX observables trigger Vue updates. The outer wrapper is also observed.

## API signature

```ts
function withViewModel<TViewModel extends AnyViewModel>(
  model: Class<TViewModel>,
  component: Component,
  config?: ViewModelHocConfig<TViewModel>,
): VMComponent<TViewModel, TComponentOriginProps>;

function withViewModel<TViewModel extends AnyViewModel>(
  model: Class<TViewModel>,
  config?: ViewModelHocConfig<TViewModel>,
): (component: Component) => VMComponent<TViewModel, TComponentOriginProps>;
```

`ViewModelSimple` overloads are also available; configuration options are a subset (no full `UseCreateViewModelConfig`).

## Configuration

### `getPayload`

Builds the view model `payload` from the wrapper’s props (and attrs).

**Default:** `(props) => props.payload`

Example — treat all props except internal ones as payload via attrs/props in your wrapper usage:

```ts
const Connected = withViewModel(VM, View, {
  getPayload: (allProps) => ({ title: allProps.input }),
});
```

### `fallback`

Vue **component** (not a render function) shown while the view model is not allowed to render yet (for example before mount or when the store blocks render).

### `factory`

Custom factory for creating the view model instance. Same idea as [`viewModelsConfig.factory`](/api/view-models/view-models-config).

### `id`

Stable id for a single logical instance (important for SSR and store lookup).

### `generateId`

Custom id generator. Same role as in [`viewModelsConfig`](/api/view-models/view-models-config).

### `vmConfig`

Extra view-model config, including `wrapViewsInObserver`.

### `ctx`

Static context object used when generating ids / cache keys for this HOC call.

### `anchors`

Additional Vue **components** registered as anchors for the same VM instance. [`useViewModel(AnchorComponent)`](/vue/api/use-view-model) returns this VM when the connected tree is active.

### `connect(anchor)`

Adds an anchor after creation:

```ts
const Connected = withViewModel(VM, View).connect(Anchor);
```

## Usage

### Curried and direct forms

```ts
export const YourComponent = withViewModel(VMClass)(ViewComponent);
export const YourComponent = withViewModel(VMClass, ViewComponent);
export const YourComponent = withViewModel(VMClass, ViewComponent, { /* config */ });
export const YourComponent = withViewModel(VMClass, { /* config */ })(ViewComponent);
```

### Default slot (no inner component)

If you only pass the VM and config, you can use the **default** scoped slot `{ model }`:

```vue
<template>
  <Connected :payload="{ n: 1 }" v-slot="{ model }">
    <span>{{ model.id }}</span>
  </Connected>
</template>
```

### Full example

```ts
import { ViewModelBase } from 'mobx-view-model';
import { withViewModel } from 'mobx-view-model/vue';
import { defineComponent, h } from 'vue';
import { action, observable } from 'mobx';

class VM extends ViewModelBase {
  @observable accessor value = '';

  @action
  setValue = (value: string) => {
    this.value = value;
  };
}

const View = defineComponent({
  props: { model: { type: Object, required: true } },
  setup(props) {
    return () =>
      h('input', {
        value: (props.model as VM).value,
        onInput: (e: Event) =>
          (props.model as VM).setValue((e.target as HTMLInputElement).value),
      });
  },
});

export const YourComponent = withViewModel(VM, View);
```

## Generic view models

TypeScript may widen generics on the wrapped component. You can cast the exported component to a more specific props type when you need payload generics (same idea as in the [React recipe](/recipes/generic-view-models-in-react)).
