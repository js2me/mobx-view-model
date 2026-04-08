# `ViewModelsProvider` and `ActiveViewModelProvider`

## `ViewModelsProvider`

Provides a [ViewModelStore](/api/view-model-store/overview) instance to the Vue subtree via `provide` / `inject`, enabling [`useViewModel()`](/vue/api/use-view-model) lookups by id, class, or anchor.

### API signature

```ts
const ViewModelsProvider: DefineComponent<{
  value: { type: PropType<ViewModelStore>; required: true };
}>;
```

### Usage

```vue
<script setup lang="ts">
import { ViewModelStoreBase } from 'mobx-view-model';
import { ViewModelsProvider } from 'mobx-view-model/vue';

const vmStore = new ViewModelStoreBase();
</script>

<template>
  <ViewModelsProvider :value="vmStore">
    <slot />
  </ViewModelsProvider>
</template>
```

## `ActiveViewModelProvider`

Explicitly provides the **active** view model for descendants. Useful when you want [`useViewModel()`](/vue/api/use-view-model) **without arguments** outside a `withViewModel` subtree (which already calls `provideActiveViewModel` internally).

### API signature

```ts
const ActiveViewModelProvider: DefineComponent<{
  value: { type: PropType<AnyViewModel | AnyViewModelSimple>; required: true };
}>;
```

### Usage

```vue
<template>
  <ActiveViewModelProvider :value="model">
    <ChildThatCallsUseViewModelWithoutArgs />
  </ActiveViewModelProvider>
</template>
```
