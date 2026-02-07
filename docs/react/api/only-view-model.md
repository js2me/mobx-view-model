# `<OnlyViewModel />` Component  

Component that creates an instance of a passed [`ViewModel`](/api/view-models/interface) class and renders nothing or the provided `children`.  
If `children` is a function, it receives the created model.  
`ViewModelSimple` is not supported here.  


## Example   

```tsx
import { ViewModelBase, OnlyViewModel } from "mobx-view-model";

class TestVM extends ViewModelBase {
  foo = 100;
}

<OnlyViewModel model={TestVM} /> 
```

