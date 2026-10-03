# `ViewModelsProvider` Component   

<ReactImportDeprecationWarning />

A context provider component that establishes a [ViewModelStore](/api/view-model-store/overview) instance for the React component tree,
enabling centralized [ViewModel](/api/view-models/overview) management and cross-component access.  

## API Signature
```tsx
function ViewModelsProvider(props: { children?: ReactNode; value: ViewModelStore }): ReactNode;
```

::: warning Keep `value` stable
Changing `value` does not move existing view models to the new store. To switch stores, remount the provider subtree (for example, change its `key`).
:::

### Usage  

```tsx
import { ViewModelStoreBase } from "mobx-view-model";
import { ViewModelsProvider } from "mobx-view-model-react";

const vmStore = new ViewModelStoreBase();

export const App = () => {
  return (
    <ViewModelsProvider value={vmStore}>
      ...
    </ViewModelsProvider>
  )
}
```
