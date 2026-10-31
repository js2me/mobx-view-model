# `useViewModel` hook

Provides access to an **already created** [ViewModel](/api/view-models/overview) instance in a Solid component.

::: tip To **create** a ViewModel  
Use [`useCreateViewModel`](/solid/api/use-create-view-model) or [`withViewModel`](/solid/api/with-view-model).  
:::

## API Signature

```tsx
function useViewModel<VM extends AnyViewModel>(): VM;

function useViewModel<VM extends AnyViewModel>(
  vmLookup: ViewModelLookup<VM>,
): VM;
```

## Usage

### 1. Active parent (no lookup)

::: tip Requires [`withViewModel()`](/solid/api/with-view-model)  
:::

Returns the nearest active ViewModel from the Solid tree (set by `withViewModel`).

```tsx
import { useViewModel } from "mobx-view-model-solid";

export const YourComponent = () => {
  const yourVM = useViewModel<YourVM>();
  return <span>{yourVM.id}</span>;
};
```

### 2. Lookup with [ViewModelLookup](/api/other/view-model-lookup)

::: tip Requires `ViewModelStore`  
Connect it with [`<ViewModelsProvider />`](/solid/api/view-models-provider).  
:::

```tsx
import { useViewModel } from "mobx-view-model-solid";

export const YourComponent = () => {
  const yourVM = useViewModel<YourVM>("view-model-id");
  return <span>{yourVM.id}</span>;
};
```

### 3. Lookup by anchor component

When using [anchors](/solid/api/with-view-model#anchors) or [connect()](/solid/api/with-view-model#connectanchor), pass the anchor as lookup:

```tsx
import { useViewModel, withViewModel } from "mobx-view-model-solid";

const Anchor = () => null;
const MainView = withViewModel(VM, View, { anchors: [Anchor] });

const Consumer = () => {
  const model = useViewModel<VM>(Anchor);
  return <span>{model.id}</span>;
};
```
