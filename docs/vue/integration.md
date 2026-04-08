---
id: vue-integration-guide
title: Vue integration guide
sidebar_label: Integration
sidebar_position: 1
slug: /vue/integration
---

# Integration with Vue

Integration consists of **2–3 steps**.

## 1. Connect ViewModel with View

Your [ViewModel](/api/view-models/interface) should be connected to a Vue component.  
To achieve this you can use:

- [`withViewModel()`](/vue/api/with-view-model) — recommended way
- [`useCreateViewModel()`](/vue/api/use-create-view-model) — simplest way, often more performant

## 2. Render in the Vue tree

### Using [`withViewModel()`](/vue/api/with-view-model)

Render the component returned from `withViewModel`. Pass `payload` as a prop when your view model expects a payload.

```vue
<script setup lang="ts">
import { ViewModelBase } from 'mobx-view-model';
import { withViewModel } from 'mobx-view-model/vue';
import { defineComponent, h } from 'vue';

class YourComponentVM extends ViewModelBase {}

const YourComponent = withViewModel(
  YourComponentVM,
  defineComponent({
    props: { model: { type: Object, required: true } },
    setup(props) {
      return () => h('div', (props.model as YourComponentVM).id);
    },
  }),
);
</script>

<template>
  <YourComponent />
</template>
```

You can also pass a separate view component as the second argument; the wrapper will forward props (except `payload`) and inject `model`.

### Using [`useCreateViewModel()`](/vue/api/use-create-view-model)

Call the composable inside `setup` (or `<script setup>`) and use the returned model in your template or render function. Wrap the view in [`observer()`](/vue/api/with-view-model#observer-wrapper) from `mobx-view-model/vue` when you read MobX observables, or rely on `withViewModel`, which applies `observer` to the inner view by default.

```vue
<script setup lang="ts">
import { ViewModelBase } from 'mobx-view-model';
import { observer, useCreateViewModel } from 'mobx-view-model/vue';

class YourComponentVM extends ViewModelBase {}

const model = useCreateViewModel(YourComponentVM);
</script>

<template>
  <div>{{ model.id }}</div>
</template>
```

`<script setup>` alone does **not** subscribe to MobX observables on the template. If the view reads **observable** view-model state, wrap the component with `observer()` (e.g. move logic into a child component wrapped by `observer`, or use [`withViewModel`](/vue/api/with-view-model), which wraps the inner view by default).

For render-function components, use `observer(defineComponent({ ... }))` so MobX-driven updates trigger re-renders.

## 3. _[Optional]_ Use [ViewModelStore](/api/view-model-store/interface)

[ViewModelStore](/api/view-model-store/interface) lets you look up and access view model instances across the tree.

1. Create an instance of `ViewModelStore` (for example `ViewModelStoreBase`).
2. Wrap your app with [`ViewModelsProvider`](/vue/api/view-models-provider).

```vue
<script setup lang="ts">
import { ViewModelStoreBase } from 'mobx-view-model';
import { ViewModelsProvider } from 'mobx-view-model/vue';

const vmStore = new ViewModelStoreBase();
</script>

<template>
  <ViewModelsProvider :value="vmStore">
    <!-- app -->
  </ViewModelsProvider>
</template>
```

With a store in place, you can use [`useViewModel()`](/vue/api/use-view-model) with a lookup argument (id, class name, or anchor component).

::: tip [`isMounted`](/api/view-models/interface#ismounted-boolean) state

This state follows [`mount()`](/api/view-models/interface#mount-void-promise-void), which runs when the Vue instance is mounted (`onMounted`), or via the store lifecycle when using `ViewModelStore`.  
On the first render, `isMounted` is typically `false` until mounting completes.

:::

::: warning Do not call [`mount()`](/api/view-models/interface#mount-void-promise-void) or [`unmount()`](/api/view-models/interface#unmount-void-promise-void) manually

These are already invoked by the [store base implementation](/api/view-model-store/base-implementation) or by [`useCreateViewModel()`](/vue/api/use-create-view-model).

:::
