# `useViewModel`

Composable that returns an **already created** [ViewModel](/api/view-models/overview) instance.

::: tip To **create** a view model

Use [`useCreateViewModel()`](/vue/api/use-create-view-model) or [`withViewModel()`](/vue/api/with-view-model).

:::

## API signature

```ts
function useViewModel<T extends AnyViewModel | AnyViewModelSimple>(
  vmLookup?: ViewModelLookup<T>,
): T;
```

## Usage

### 1. Active view model (no argument)

Requires an active model from [`withViewModel()`](/vue/api/with-view-model) (which provides it) or from [`ActiveViewModelProvider`](/vue/api/view-models-provider#activeviewmodelprovider).

```ts
import { useViewModel } from 'mobx-view-model/vue';

const yourVM = useViewModel<YourVM>();
```

### 2. Lookup with [ViewModelLookup](/api/other/view-model-lookup)

Requires [`ViewModelsProvider`](/vue/api/view-models-provider) with a connected store.

```ts
const yourVM = useViewModel<YourVM>('view-model-id');
```

### 3. Lookup by anchor component

Same as React: register anchors in [`withViewModel` config](/vue/api/with-view-model#anchors) or via [`connect()`](/vue/api/with-view-model#connectanchor).

```ts
const Anchor = defineComponent({ name: 'Anchor', setup: () => () => null });
const MainView = withViewModel(VM, View, { anchors: [Anchor] });

// In a child:
const model = useViewModel<VM>(Anchor);
```
