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
import { ViewModelsProvider } from 'mobx-view-model-vue';

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
<script setup lang="ts">
import { ViewModelBase } from 'mobx-view-model';
import { ActiveViewModelProvider, useCreateViewModel } from 'mobx-view-model-vue';
import ChildThatCallsUseViewModelWithoutArgs from './ChildThatCallsUseViewModelWithoutArgs.vue';

class PageVM extends ViewModelBase {}
const model = useCreateViewModel(PageVM);
</script>

<template>
  <ActiveViewModelProvider :value="model">
    <ChildThatCallsUseViewModelWithoutArgs />
  </ActiveViewModelProvider>
</template>
```

Provider values are stable for the lifetime of their subtree. To switch the store or active model, change the provider's Vue `key` so descendants are recreated with the new context. Existing model lifecycle hooks remain tied to the store that created them.
