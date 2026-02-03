# `useViewModel` hook   

A hook that provides access to an **already created** [ViewModel](/api/view-models/overview) instance within a **React** component.  

::: tip If you need to **create** instance of [ViewModel](/api/view-models/overview)   
Please use hook [`useCreateViewModel`](/react/api/use-create-view-model) or HOC [`withViewModel`](/react/api/with-view-model)  
:::

## API Signature
```tsx
function useViewModel<VM extends AnyViewModel>(): VM

function useViewModel<VM extends AnyViewModel>(vmLookup: ViewModelLookup<VM>): VM
```

## Usage 

### 1. Basic Usage  
::: tip Requires [`withViewModel()`](/react/api/with-view-model) HOC usage to access  
:::

Reference to the last created [ViewModel](/api/view-models/overview) instance based on `React` tree  
Use generic type (`YourVM`) to define type of returning [view model instance](/api/view-models/overview)  

```tsx
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const yourVM = useViewModel<YourVM>();
});
```

### 2. Precise search with [ViewModelLookup](/api/other/view-model-lookup)  

::: tip Requires `ViewModelStore`
This variant requires connected [`ViewModelStore`](/api/view-model-store/overview) to your React application using [`<ViewModelsProvider />`](/react/api/view-models-provider) HOC
:::

Use argument [`vmLookup`](/api/other/view-model-lookup) to define specific identifier of returning
[ViewModel](/api/view-models/interface) instance and generic for the same as above usage    


```tsx
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const yourVM = useViewModel<YourVM>('view-model-id');
});
```

### 3. Lookup by anchor component  
When using [anchors](/react/api/with-view-model#anchors) or [connect()](/react/api/with-view-model#connectanchor----method-on-returned-vmcomponent), pass the anchor component as lookup:

```tsx
const Anchor = () => null;
const MainView = withViewModel(VM, View, { anchors: [Anchor] });

const Consumer = observer(() => {
  const model = useViewModel<VM>(Anchor); // same VM as MainView receives
  return <span>{model.id}</span>;
});
```

### 4. Lookup from lazy-loaded component  
With [react-simple-loadable](https://github.com/js2me/react-simple-loadable) or similar, use `connect()` to register the loadable as anchor. `PageLazy` is the loadable-wrapped `Page`; after `Page.connect(PageLazy)` the lazy chunk can access the VM via `useViewModel(PageLazy)`:

```tsx
// page.lazy.tsx
import { loadable } from 'react-simple-loadable';

export const PageLazy = loadable(
  () => import('./page').then((m) => m.Page),
  () => <div>Loading...</div>,
);

// page.tsx
import { PageLazy } from './page.lazy';

export const Page = withViewModel(PageVM, ({ model }) => (
  <div>
    <main>...</main>
  </div>
));
Page.connect(PageLazy);
```

```tsx
// Some child inside the lazy chunk — uses the same VM
const model = useViewModel<PageVM>(PageLazy);
```

