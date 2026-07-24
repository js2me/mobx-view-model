# `ViewModelsProvider` Component

Context provider that establishes a [ViewModelStore](/api/view-model-store/overview) for the Solid component tree.

## API Signature

```tsx
function ViewModelsProvider(props: {
  value: ViewModelStore;
  children?: JSX.Element;
}): JSX.Element;
```

## Usage

```tsx
import { ViewModelStoreBase } from "mobx-view-model";
import { ViewModelsProvider } from "mobx-view-model-solid";

const vmStore = new ViewModelStoreBase();

export const App = () => {
  return (
    <ViewModelsProvider value={vmStore}>
      ...
    </ViewModelsProvider>
  );
};
```
