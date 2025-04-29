# `ViewModelsProvider` Component   

A context provider component that establishes a [ViewModelStore](/api/view-model-store/overview) instance for the React component tree,
enabling centralized [ViewModel](/api/view-models/overview) management and cross-component access.  

## API Signature
```tsx
function ViewModelsProvider(props: { children: ReactNode; value: ViewModelStore }): ReactNode;
```

### Usage  

```tsx
import { ViewModelStoreBase, ViewModelsProvider } from "mobx-view-model";

const vmStore = new ViewModelStoreBase();

export const App = () => {
  return (
    <ViewModelsProvider value={vmStore}>
      ...
    </ViewModelsProvider>
  )
}
```