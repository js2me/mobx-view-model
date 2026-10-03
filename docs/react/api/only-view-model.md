# `<OnlyViewModel />` Component  

<ReactImportDeprecationWarning />

Component that creates an instance of a passed [`ViewModel`](/api/view-models/interface) class. It renders `null` until the model is mounted, then renders the provided `children` (or nothing when no children are supplied).
If `children` is a function, it receives the created model.  
`ViewModelSimple` is not supported here.  

## Props

- `model` — ViewModel class to create.
- `payload` — payload passed to the ViewModel. It is required when the ViewModel payload type is not partial.
- `config` — optional configuration accepted by [`useCreateViewModel`](/react/api/use-create-view-model).
- `children` — React node or a function that receives the mounted model.


## Example   

```tsx
import { ViewModelBase } from "mobx-view-model";
import { OnlyViewModel } from "mobx-view-model-react";

class TestVM extends ViewModelBase {
  foo = 100;
}

<OnlyViewModel model={TestVM} /> 

<OnlyViewModel model={TestVM}>
  {model => <span>{model.foo}</span>}
</OnlyViewModel>
```
