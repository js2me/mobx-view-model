# `useViewModel` hook   

A hook that provides access to an **already created** [ViewModel](/api/view-models/overview) instance within a **React** component.  

::: tip IF you need to **create** instance of [ViewModel](/api/view-models/overview)   
Please use hook [`useCreateViewModel`](/react/api/use-create-view-model) or HOC [`withViewModel`](/react/api/with-view-model)  
:::

## API Signature
```tsx
function useViewModel<VM extends AnyViewModel>(): VM

function useViewModel<VM extends AnyViewModel>(vmLookup: ViewModelLookup<VM>): VM
```

## Usage 

### 1. Basic Usage  
Reference to the last created [ViewModel](/api/view-models/overview) instance based on `React` tree  
Use generic type (`YourVM`) to define type of returning [view model instance](/api/view-models/overview)  

```tsx
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const yourVM = useViewModel<YourVM>();
});
```

::: tip
It works only with [`withViewModel()`](/react/api/with-view-model) HOC  
:::

### 2. Precise search with [ViewModelLookup](/api/other/view-model-lookup)  
Use argument [`vmLookup`](/api/other/view-model-lookup) to define specific identifier of returning
[ViewModel](/api/view-models/interface) instance and generic for the same as above usage    

::: tip
This variant requires the usage [`<ViewModelsProvider />`](/react/api/view-models-provider) in your application  
:::

```tsx
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const yourVM = useViewModel<YourVM>('view-model-id');
});
```
