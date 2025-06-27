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
