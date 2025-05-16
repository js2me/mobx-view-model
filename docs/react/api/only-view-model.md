# `<OnlyViewModel />` Component  

Component which creates the instance of passed [`ViewModel`](/api/view-models/interface) or [`ViewModelSimple`](/api/view-models/view-model-simple) class and renders nothing or passed `children`.  


## Example   

```tsx
import { ViewModelBase, OnlyViewModel } from "mobx-view-model";

class TestVM extends ViewModelBase {
  foo = 100;
}

<OnlyViewModel model={TestVM} /> 
```

