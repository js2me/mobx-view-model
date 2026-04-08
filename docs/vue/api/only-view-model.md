# `OnlyViewModel`

Component that creates an instance of the given [`ViewModel`](/api/view-models/interface) class and renders nothing, or renders the default **scoped slot** with `{ model }`.

`ViewModelSimple` is routed through the same entrypoint but does not use the full create config path; prefer full `ViewModelBase` for predictable store integration.

## Props

- `model` — class constructor (required)
- `payload` — optional (required at the type level when the VM payload is not partial)
- `config` — optional [`UseCreateViewModelConfig`](/vue/api/use-create-view-model#usecreateviewmodelconfig)

## Example

```vue
<script setup lang="ts">
import { ViewModelBase } from 'mobx-view-model';
import { OnlyViewModel } from 'mobx-view-model/vue';

class TestVM extends ViewModelBase {
  foo = 100;
}
</script>

<template>
  <OnlyViewModel :model="TestVM" v-slot="{ model }">
    <span>{{ model.foo }}</span>
  </OnlyViewModel>
</template>
```

```vue
<OnlyViewModel :model="TestVM" />
```
